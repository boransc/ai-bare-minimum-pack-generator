import {
  ANSWER_FIELDS,
  QUESTION_LABELS,
  answerLabel,
  answerLabels,
} from "@/content/v1/wizard";
import type { WizardAnswers } from "@/lib/domain/types";

/**
 * What the organisation told us about itself, recorded on the pack.
 *
 * This exists for two reasons, one of them a correction.
 *
 * The correction: a requirements audit found that `sector` and `size` reached
 * the tailoring prompt and the lead list but appeared nowhere a visitor could
 * see. With tailoring switched off — the fallback this architecture treats as
 * the default path — answering them changed nothing on the page at all. The
 * brief is explicit that "every question must change the output; if it doesn't,
 * cut it", and cutting them was not the right answer because they genuinely
 * shape the tailored prose. Showing them is.
 *
 * The better reason: the pack is a dated record an organisation is told to keep
 * and sign. A record of an assessment that does not state the context it was
 * made in is a weaker record. Someone reading this in six months should be able
 * to see that the answers were given by a 51-to-250-person housing organisation
 * that said AI touches personal data routinely — because if any of that has
 * since changed, the assessment needs re-taking.
 *
 * Deliberately prints: it is part of the record, not part of the interface.
 */
export function DeclaredContext({ wizard }: { wizard: WizardAnswers }) {
  return (
    <section className="section-block">
      <h2 className="h2">What you told us.</h2>
      <p className="lede">
        The answers this assessment was made against. If any of them change, the
        result above is worth re-taking rather than trusted.
      </p>

      <dl className="declared-context">
        {ANSWER_FIELDS.map((field) => {
          const value = wizard[field];
          return (
            <div key={field} className="declared-context-row">
              <dt>{QUESTION_LABELS[field]}</dt>
              <dd>
                {Array.isArray(value)
                  ? answerLabels(field, value)
                  : answerLabel(field, value)}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
