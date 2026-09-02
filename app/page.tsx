import Link from "next/link";
import { CONTROLS } from "@/content/v1/controls";
import {
  WHAT_THE_BARE_MINIMUM_BUYS_YOU,
  WHY_YOU_ARE_BEING_ASKED,
} from "@/content/v1/guidance";

const STEPS = [
  {
    n: "01",
    title: "Describe your context",
    body: "Eight multiple-choice questions about your sector, scale, AI use and accountability. About a minute.",
  },
  {
    n: "02",
    title: "Complete the eight-point check",
    body: "Answer the AI Minimum Standard honestly. A yes needs evidence behind it, and there is no partial credit.",
  },
  {
    n: "03",
    title: "Get a straight verdict",
    body: "Whether the minimum is in place, the exact statements you cannot yet evidence, and what to do first.",
  },
  {
    n: "04",
    title: "Work the thirty-day plan",
    body: "A checklist in the source's own sequence, a policy you can adopt, and a staff note you can send.",
  },
];

export default function Home() {
  return (
    <>
      <header className="site-header no-print">
        <Link className="brand" href="/">
          <span className="brand-mark">G</span>
          <span>Governance AI</span>
        </Link>
        <Link className="text-button" href="/start">
          Create your pack <span aria-hidden="true">↗</span>
        </Link>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <h1 className="display">
              Bring the AI already in your organisation under{" "}
              <em>minimum governance.</em>
            </h1>
            <p className="hero-intro">{WHY_YOU_ARE_BEING_ASKED[0]}</p>
            <div className="hero-actions">
              <Link className="button primary" href="/start">
                Create your tailored pack <span aria-hidden="true">→</span>
              </Link>
              <a className="button quiet" href="#how-it-works">
                See how it works <span aria-hidden="true">↓</span>
              </a>
            </div>
            <p className="assurance">
              Free · No account · About ten minutes · Nothing confidential is asked
            </p>
          </div>

          <div className="hero-art" aria-hidden="true">
            <div className="art-sheet">
              <div className="sheet-top">
                <span>AI BARE MINIMUM PACK</span>
                <span>STARTING POINT</span>
              </div>
              <div className="sheet-rule" />
              <p className="sheet-label">Prepared for</p>
              <h2>Your organisation</h2>
              <div className="sheet-index">
                {CONTROLS.slice(0, 4).map((control) => (
                  <FragmentRow key={control.number} n={control.number} title={control.title} />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="trust-strip">
          <p>Four practical documents. One month of focused work.</p>
          <div>
            <span>01</span> Eight-point check
          </div>
          <div>
            <span>02</span> Thirty-day plan
          </div>
          <div>
            <span>03</span> Policy and staff note
          </div>
        </section>

        <section className="section" id="how-it-works">
          <div className="split-heading">
            <h2 className="h2">AI adoption usually runs ahead of the controls around it.</h2>
            <div>
              <p>{WHAT_THE_BARE_MINIMUM_BUYS_YOU[0]}</p>
              <p>{WHAT_THE_BARE_MINIMUM_BUYS_YOU[1]}</p>
            </div>
          </div>
        </section>

        <section className="section tinted">
          <h2 className="h3-lead">Four steps, about ten minutes.</h2>
          <div className="steps-grid">
            {STEPS.map((step) => (
              <article key={step.n}>
                <span className="step-number">{step.n}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section">
          <div className="split-heading">
            <h2 className="h2">Eight things any organisation should have in place.</h2>
            <div>
              <p>{WHY_YOU_ARE_BEING_ASKED[1]}</p>
              <p>
                <Link className="text-button" href="/start">
                  Start the check <span aria-hidden="true">→</span>
                </Link>
              </p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

function FragmentRow({ n, title }: { n: number; title: string }) {
  return (
    <>
      <b>{String(n).padStart(2, "0")}</b>
      <span>{title}</span>
    </>
  );
}
