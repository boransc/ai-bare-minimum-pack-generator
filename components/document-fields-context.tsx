"use client";

/**
 * Shared state for one document's bracketed fields (Part 3 or Part 4).
 *
 * A field id can appear in several bracket occurrences on the same page (see
 * lib/document-fields.ts `collectFieldIds`). Lifting the value up to this
 * context, rather than keeping it per-input, is what makes editing one
 * occurrence update every other occurrence of the same field.
 *
 * `token` is undefined on the just-generated page, which has no saved,
 * returnable link yet: `commit` is then a no-op and every consumer renders
 * the static bracket instead of an input (see components/bracketed-text.tsx).
 */

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { BracketFieldId } from "@/content/v1/brackets";
import { applyFieldValue } from "@/lib/document-fields";

interface DocumentFieldsContextValue {
  token: string | undefined;
  values: Record<string, string>;
  error: string | null;
  /** Local-only echo, so every occurrence of the field updates as you type. No network call. */
  setValue: (fieldId: string, rawValue: string) => void;
  /** Persist one field. No-ops if the trimmed value matches what was last saved. */
  commit: (fieldId: string, rawValue: string) => void;
}

/** Long enough to be a pause in typing, short enough that nothing is lost to a closed tab. */
const AUTOSAVE_PAUSE_MS = 900;

const DocumentFieldsContext = createContext<DocumentFieldsContextValue | null>(null);

export function useDocumentFieldsContext(): DocumentFieldsContextValue | null {
  return useContext(DocumentFieldsContext);
}

export function DocumentFieldsProvider({
  token,
  initialFields,
  children,
}: {
  token?: string;
  initialFields: Record<string, string>;
  children: ReactNode;
}) {
  // Some field ids appear in BOTH Part 3 and Part 4 — [role], [date], [name].
  // The server stores one value per field id, so two independent providers
  // would let a visitor type "Jane" in the policy and "Bob" in the staff note,
  // see both on screen, and have the server silently keep only the last write.
  // A provider that finds itself already inside one therefore steps aside, so
  // wrapping both documents once at the pack level is enough to keep every
  // occurrence of a shared field in agreement.
  const existing = useDocumentFieldsContext();

  const [values, setValues] = useState<Record<string, string>>(initialFields);
  const [error, setError] = useState<string | null>(null);
  // The last value we believe the server actually holds, per field. Used to
  // skip re-sending an unchanged value and to know what to revert to on
  // failure. A ref, not state -- it must never itself cause a render.
  const savedRef = useRef<Record<string, string>>({ ...initialFields });

  // Pending debounce timers, one per field.
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  /**
   * A monotonic write counter per field, so a slow response cannot undo a
   * faster one that came after it.
   *
   * Two requests for the same field really can be in flight together: type,
   * pause long enough for the autosave to fire, keep typing, then blur before
   * the next autosave timer elapses. Nothing about that is adversarial. If the
   * first response then arrives second — ordinary network reordering — its
   * handler would otherwise write the OLDER value over the newer one, and the
   * error path would revert to a value the visitor had already replaced. Only
   * the most recent write for a field is allowed to apply its result.
   */
  const seqRef = useRef<Record<string, number>>({});

  const setValue = useCallback((fieldId: string, rawValue: string) => {
    setValues((current) => ({ ...current, [fieldId]: rawValue }));

    // Autosave after a pause in typing, as well as on blur and Enter.
    //
    // Blur alone is too fragile to be the only trigger: someone who types
    // their AI lead's name and then closes the tab, or navigates away, or
    // whose browser never fires the blur, loses the value with no warning and
    // no way to know. A pause is not a keystroke, so this is still one request
    // per edit rather than one per character.
    clearTimeout(timersRef.current[fieldId]);
    timersRef.current[fieldId] = setTimeout(() => {
      commitRef.current(fieldId, rawValue);
    }, AUTOSAVE_PAUSE_MS);
  }, []);

  const commit = useCallback(
    (fieldId: string, rawValue: string) => {
      if (!token) return;

      // A pending autosave for this field is now redundant.
      clearTimeout(timersRef.current[fieldId]);

      const trimmed = rawValue.trim();
      const previouslySaved = savedRef.current[fieldId] ?? "";
      if (trimmed === previouslySaved) return; // unchanged since the last successful save

      setError(null);
      savedRef.current = { ...savedRef.current, [fieldId]: trimmed };

      const mySeq = (seqRef.current[fieldId] ?? 0) + 1;
      seqRef.current[fieldId] = mySeq;
      const isStale = () => seqRef.current[fieldId] !== mySeq;

      fetch("/api/document-fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, fieldId, value: rawValue }),
      })
        .then(async (response) => {
          if (!response.ok) {
            const body = await response.json().catch(() => null);
            throw new Error(body?.message ?? "That didn't save. Please try again.");
          }
          return (await response.json()) as { fields: Record<string, string> };
        })
        .then((body) => {
          // A newer write for this field has already been sent; its answer is
          // the one that counts.
          if (isStale()) return;

          // Trust the server's own record of this field over our optimistic
          // guess -- it is the one that trims and clears on empty.
          const serverValue = body.fields?.[fieldId] ?? "";
          savedRef.current = { ...savedRef.current, [fieldId]: serverValue };
          setValues((current) => applyFieldValue(current, fieldId, serverValue));
        })
        .catch((err: unknown) => {
          // Do not revert on behalf of a superseded write: the value it would
          // restore is one the visitor has already typed past.
          if (isStale()) return;

          savedRef.current = { ...savedRef.current, [fieldId]: previouslySaved };
          setValues((current) => ({ ...current, [fieldId]: previouslySaved }));
          setError(
            err instanceof Error ? err.message : "That didn't save. Please try again.",
          );
        });
    },
    [token],
  );

  // Declared after every hook above, so hook order stays identical between
  // renders whether or not an outer provider exists.
  if (existing) return <>{children}</>;

  // setValue is declared before commit, so it reaches it through a ref rather
  // than forcing the two callbacks into a dependency cycle.
  const commitRef = useRef(commit);
  commitRef.current = commit;

  return (
    <DocumentFieldsContext.Provider value={{ token, values, error, setValue, commit }}>
      {children}
    </DocumentFieldsContext.Provider>
  );
}

/**
 * "N of M fields filled" -- the quiet return-visit hook. Renders nothing on
 * the just-generated page (no token means nothing is actually being saved),
 * and nothing in print, where it would just be clutter.
 */
export function DocumentFieldsStatus({ fieldIds }: { fieldIds: BracketFieldId[] }) {
  const ctx = useDocumentFieldsContext();
  if (!ctx?.token) return null;

  const filled = fieldIds.filter((id) => Boolean(ctx.values[id]?.trim())).length;

  return (
    <div className="doc-fields-status no-print">
      <p className="doc-fields-progress" aria-live="polite">
        {filled} of {fieldIds.length} fields filled
      </p>
      {ctx.error && (
        <p className="field-error" role="alert">
          {ctx.error}
        </p>
      )}
    </div>
  );
}
