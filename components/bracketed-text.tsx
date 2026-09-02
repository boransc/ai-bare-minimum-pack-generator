/**
 * Renders a verbatim source string, substituting the real organisation name
 * for `[Organisation Name]` where we have one, and rendering every other
 * bracketed placeholder as a visible "fill this in" span rather than the
 * literal punctuation. We never guess a value the source did not give us.
 */

import { BRACKET_FIELDS, BRACKET_PATTERN } from "@/content/v1/brackets";

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

  // An unrecognised bracket is a transcription bug, not a user-facing case —
  // render the raw text so the mistake is visible rather than swallowed.
  if (!field) return <span className="doc-bracket doc-bracket-unknown">{raw}</span>;

  if (field.id === "orgName" && orgName) {
    return <span className="doc-bracket-filled">{orgName}</span>;
  }

  return (
    <span className="doc-bracket" aria-label={`Fill in: ${field.label}`}>
      {raw}
    </span>
  );
}
