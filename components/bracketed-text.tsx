"use client";

/**
 * Renders a verbatim source string, substituting the real organisation name
 * for `[Organisation Name]` where we have one, and turning every other
 * bracketed placeholder into a fill-in field.
 *
 * When the surrounding document has a token (a saved, returnable pack, via
 * DocumentFieldsProvider) a bracket becomes a real inline input, wired so
 * every occurrence of the same field id stays in sync and saves back to
 * /api/document-fields on blur or Enter. Without a token -- the
 * just-generated page has none yet -- it stays the static visible bracket it
 * always was. Print always shows the input's flattened text instead of the
 * input itself (see the .doc-bracket-print rules in pack-documents.css);
 * that is a CSS concern, not a branch here.
 */

import { useId } from "react";
import { BRACKET_FIELDS, BRACKET_PATTERN, type BracketField } from "@/content/v1/brackets";
import { useDocumentFieldsContext } from "./document-fields-context";

interface BracketedProps {
  text: string;
  orgName: string | null;
}

export function Bracketed({ text, orgName }: BracketedProps) {
  const parts = text.split(BRACKET_PATTERN);
  const matches = text.match(BRACKET_PATTERN) ?? [];

  return (
    <>
      {parts.map((part, i) => {
        const match = matches[i];
        return (
          <span key={i}>
            {part}
            {match && <BracketSpan raw={match} orgName={orgName} />}
          </span>
        );
      })}
    </>
  );
}

function BracketSpan({ raw, orgName }: { raw: string; orgName: string | null }) {
  const field = BRACKET_FIELDS[raw];
  const ctx = useDocumentFieldsContext();

  // An unrecognised bracket is a transcription bug, not a user-facing case --
  // render the raw text so the mistake is visible rather than swallowed.
  if (!field) return <span className="doc-bracket doc-bracket-unknown">{raw}</span>;

  if (field.id === "orgName" && orgName) {
    return <span className="doc-bracket-filled">{orgName}</span>;
  }

  if (ctx?.token) {
    return (
      <EditableBracket
        field={field}
        value={ctx.values[field.id] ?? ""}
        onEdit={ctx.setValue}
        onCommit={ctx.commit}
      />
    );
  }

  return (
    <span className="doc-bracket" aria-label={`Fill in: ${field.label}`}>
      {raw}
    </span>
  );
}

function EditableBracket({
  field,
  value,
  onEdit,
  onCommit,
}: {
  field: BracketField;
  value: string;
  onEdit: (fieldId: string, value: string) => void;
  onCommit: (fieldId: string, value: string) => void;
}) {
  // A visually-hidden <label> carries the human field name (e.g. "AI lead:
  // name, role") so a screen reader hears what to type, not "edit text".
  const inputId = useId();

  return (
    <span className="doc-bracket-field">
      <label htmlFor={inputId} className="sr-only">
        {field.label}
      </label>
      <input
        id={inputId}
        type="text"
        className="doc-bracket-input"
        value={value}
        placeholder={field.label}
        onChange={(event) => onEdit(field.id, event.target.value)}
        onBlur={(event) => onCommit(field.id, event.target.value)}
        onKeyDown={(event) => {
          // Enter saves and moves on, same as blurring -- it does not submit
          // anything, since this input never sits inside a <form>.
          if (event.key === "Enter") {
            event.preventDefault();
            onCommit(field.id, event.currentTarget.value);
            event.currentTarget.blur();
          }
        }}
      />
      {/* Print-only flattened text: plain prose when filled, a ruled blank
          line to complete by hand when empty. Never the literal bracket. */}
      <span className="doc-bracket-print" aria-hidden="true">
        {value || null}
      </span>
    </span>
  );
}
