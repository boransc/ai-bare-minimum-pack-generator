/**
 * The AI Minimum Standard: the eight-point check.
 *
 * ---------------------------------------------------------------------------
 * CANONICAL SOURCE CONTENT. DO NOT EDIT WITHOUT SIGN-OFF.
 *
 * Every `title`, `summary` and sub-statement `text` below is transcribed
 * verbatim from "The AI Bare Minimum Pack" by Karl George MBE. `goodEnough`
 * and `mistakeToAvoid` are verbatim from Part 2, the starter guidance note.
 * Action titles and details are condensed from the source's own bullets under
 * "What to do against each point" — they instruct, they do not add requirements.
 *
 * Changing any string here changes what the product tells organisations they
 * must do. That is a content decision for Governance AI, not a code change.
 * See docs/spec/product-technical-spec.md section 9.
 * ---------------------------------------------------------------------------
 */

import type { Control } from "@/lib/domain/types";

const ALWAYS = { kind: "always" } as const;

export const CONTROLS: Control[] = [
  {
    number: 1,
    title: "Someone owns AI",
    summary:
      "One named person is accountable for how AI is used across the organisation, and AI is a standing item at least quarterly.",
    redLine: false,
    planWeek: 1,
    goodEnough:
      "Good enough is a named person with the authority to approve tools and the time to maintain a list. In a small business that is usually the MD, the operations lead or the finance director, and it does not need to be anyone technical.",
    mistakeToAvoid:
      "Handing it to IT and calling it done, when the accountability sits with the leadership and only the tooling sits with IT.",
    subStatements: [
      {
        id: "1.1",
        text: "We have named an AI lead, and everyone knows who it is.",
        applicability: ALWAYS,
        action: {
          title: "Name your AI lead and tell everyone who it is",
          detail:
            "Give the role about half a day a month, and say so out loud. It does not need to be anyone technical.",
        },
      },
      {
        id: "1.2",
        text: "AI use, risks and incidents are reported to the board or senior team at least quarterly.",
        applicability: ALWAYS,
        action: {
          title: "Put AI on your existing management or board agenda, quarterly",
          detail:
            "Make it a standing item covering tools, incidents and training. Use the meeting you already hold.",
        },
      },
    ],
  },

  {
    number: 2,
    title: "You know what is being used",
    summary:
      "You hold a written list of approved AI tools and a simple register of what is actually in use.",
    redLine: false,
    planWeek: 1,
    goodEnough:
      "Good enough is a single spreadsheet listing every AI tool in use, who uses it, what for, and whether it touches client, personal or confidential data. Build it from what people actually tell you.",
    mistakeToAvoid:
      "Counting only the tools you pay for, when the exposure usually sits in the free ones.",
    subStatements: [
      {
        id: "2.1",
        text: "We have an approved AI tools list that staff can find in under a minute.",
        applicability: ALWAYS,
        action: {
          title: "Publish the approved AI tools list somewhere people can find it",
          detail:
            "Split it into approved, approved with conditions, and not approved.",
        },
      },
      {
        id: "2.2",
        text: "Our register records each tool, who uses it, what for, and whether it touches client, personal or confidential data.",
        applicability: ALWAYS,
        action: {
          title: "Build the AI register from what people actually tell you",
          detail:
            "Ask every team in writing, make it safe to answer honestly, and add the AI features already inside the software you own.",
        },
      },
    ],
  },

  {
    number: 3,
    title: "You have a written AI usage policy",
    summary:
      "A policy exists, it has been issued to everyone, and people have confirmed they have read it.",
    redLine: false,
    planWeek: 3,
    goodEnough:
      "Good enough is the template in this pack, with the bracketed fields filled in, approved at a meeting with the decision minuted, and issued to everyone with a signed acknowledgement.",
    mistakeToAvoid:
      "A policy that exists in a folder nobody has opened. If people cannot tell you the three data rules from memory, it has not been issued properly.",
    subStatements: [
      {
        id: "3.1",
        text: "Every member of staff, including contractors and temporary workers, has received the policy.",
        applicability: ALWAYS,
        action: {
          title: "Approve the policy at a meeting, then issue it to everyone",
          detail:
            "Fill in the placeholders, minute the approval, and collect acknowledgements from employees, contractors and temporary workers.",
        },
      },
      {
        id: "3.2",
        text: "The policy is part of induction, and acknowledgements are recorded.",
        applicability: ALWAYS,
        action: {
          title: "Add the policy to your induction pack",
          detail: "Do it the same day you issue it, and keep the acknowledgement records.",
        },
      },
    ],
  },

  {
    number: 4,
    title: "Your data rules are explicit",
    summary:
      "People know exactly what must never be entered into an AI tool, and which tools are cleared for which categories of data.",
    redLine: true,
    planWeek: 2,
    goodEnough:
      "Good enough is one paragraph everybody can recite: what never goes in, which tools are cleared for what, and who to ask when you are unsure.",
    mistakeToAvoid:
      "Relying on common sense, because everyone's common sense is different, so write the rules down.",
    subStatements: [
      {
        id: "4.1",
        text: "We have a written, plain-language rule on confidential, client and personal data in AI tools.",
        applicability: ALWAYS,
        action: {
          title: "Write the never list in plain language and issue it",
          detail:
            "Teach data minimisation, and cover the two everyone forgets: information about colleagues and job applicants, and client contracts that restrict AI use.",
        },
      },
      {
        id: "4.2",
        text: "For every approved tool that touches personal data we have checked the data processing terms, confirmed a lawful basis, and turned off training on our data where that option exists.",
        applicability: ALWAYS,
        action: {
          title: "Check the data terms for every tool cleared for personal data",
          detail:
            "Confirm the lawful basis and switch off any option to train the provider's models on your data.",
        },
      },
    ],
  },

  {
    number: 5,
    title: "Unapproved tools are brought into the open",
    summary:
      "Staff can ask for a new tool easily, and they can declare what they are already using without fear of what happens next.",
    redLine: false,
    planWeek: 1,
    goodEnough:
      "Good enough is an easy request route with a fast answer, plus a one-off amnesty so people can declare what they are already using without consequence.",
    mistakeToAvoid:
      "Treating disclosure as a disciplinary matter. Do that once and you will never hear about a tool again.",
    subStatements: [
      {
        id: "5.1",
        text: "There is a simple request route for new AI tools, and requests are answered within days.",
        applicability: ALWAYS,
        action: {
          title: "Open a request route and promise a decision within five working days",
          detail:
            "Ban personal accounts for work and provide a sanctioned alternative the same week. A ban without a substitute drives it underground.",
        },
      },
      {
        id: "5.2",
        text: "We have run an amnesty so people could declare the tools and personal accounts they were already using for work.",
        applicability: ALWAYS,
        action: {
          title: "Run the amnesty with a deadline",
          detail:
            "Say plainly that nobody will be penalised for coming forward, and mean it.",
        },
      },
    ],
  },

  {
    number: 6,
    title: "A human checks before anything leaves",
    summary:
      "No AI-assisted work reaches a client, a customer, a regulator or the board without a named human verifying it.",
    redLine: true,
    planWeek: 2,
    goodEnough:
      "Good enough is a rule everyone knows: nothing AI has touched leaves the organisation until a named person has checked the facts, figures and sources, and for anything significant, a second qualified person has signed it off.",
    mistakeToAvoid:
      "Assuming the reviewer will spot it. Fabricated content reads better than the real thing, which is exactly why it gets through.",
    subStatements: [
      {
        id: "6.1",
        text: "Facts, figures, quotations and sources in AI-assisted output are checked against a reliable source before release.",
        applicability: ALWAYS,
        action: {
          title: "Make verification a named step in your existing review process",
          detail:
            "Verify citations, statistics and quotations against the original source every time. This is where the damage happens.",
        },
      },
      {
        id: "6.2",
        text: "For high-impact work, a second qualified person reviews and signs off, and we can show who that was.",
        applicability: ALWAYS,
        action: {
          title: "Record who verified what, and when, on high-impact work",
          detail: "A line in the file is enough.",
        },
      },
      {
        id: "6.3",
        text: "Where AI touches a decision about a person, such as recruitment, performance, credit, eligibility or refusal of service, a named human makes the decision and we can show how it was reviewed.",
        applicability: {
          kind: "onlyWhenConsequentialDecisions",
          disapplyReason:
            "You told us AI plays no part in decisions about people, so this statement does not apply. It applies the moment that changes.",
        },
        action: {
          title: "Keep the decision with a named human, and show the review",
          detail:
            "Where AI touches recruitment, performance, credit, eligibility or refusal of service, a person decides and records how they reached it.",
        },
      },
    ],
  },

  {
    number: 7,
    title: "You tell people when AI is involved",
    summary:
      "Your AI use is visible to the people affected by it, at a level proportionate to the contribution.",
    redLine: false,
    planWeek: 4,
    goodEnough:
      "Good enough is a standing statement on your website, a line in your email footer, disclosure of note-takers in external meetings, and a declaration on client deliverables where AI made a substantive contribution.",
    mistakeToAvoid:
      "Over-declaring everything. If you label a grammar check, the label stops meaning anything.",
    subStatements: [
      {
        id: "7.1",
        text: "A short AI statement sits on our website, and an AI line sits in our email footer.",
        applicability: ALWAYS,
        action: {
          title: "Publish a website AI statement and add a line to the email footer",
          detail:
            "Cover how you use AI, your human accountability and your data protection position. Together these cover routine correspondence.",
        },
      },
      {
        id: "7.2",
        text: "AI note-takers and transcription tools are disclosed in the invitation and confirmed verbally before any external meeting starts.",
        applicability: ALWAYS,
        action: {
          title: "Put note-taker disclosure into your meeting invitation template",
          detail:
            "Say it out loud at the start of external calls. Under data protection law that one is not optional.",
        },
      },
      {
        id: "7.3",
        text: "Client deliverables carry a declaration where AI made a substantive contribution (AI-2 and above on the AI Transparency Index™).",
        applicability: ALWAYS,
        action: {
          title: "Declare substantive AI contribution on client deliverables",
          detail:
            "Use the AI Transparency Index™ to decide how much to say: AI-2 needs a sentence, AI-3 needs a methodology statement.",
        },
      },
    ],
  },

  {
    number: 8,
    title: "People are trained, and incidents get reported",
    summary:
      "Everyone has had at least a short session on responsible AI use, and there is a route to report when something goes wrong.",
    redLine: false,
    planWeek: 4,
    goodEnough:
      "Good enough is a single hour for everyone covering the policy, the data rules, verification and how to report a problem, repeated annually and included in induction.",
    mistakeToAvoid:
      "Training the leadership team and nobody else. The exposure sits with whoever touches client work, which is usually everyone.",
    subStatements: [
      {
        id: "8.1",
        text: "All staff have completed basic AI governance and data protection training in the last twelve months.",
        applicability: ALWAYS,
        action: {
          title: "Run the training hour for everyone",
          detail:
            "Use real examples from your own work rather than generic slides. Repeat it annually and include it in induction.",
        },
      },
      {
        id: "8.2",
        text: "There is a named contact for AI incidents, staff know the reporting route, and incidents are logged and reviewed.",
        applicability: ALWAYS,
        action: {
          title: "Name the incident contact and give people the route in writing",
          detail:
            "Log every incident, even the small ones, and take the log to your quarterly meeting.",
        },
      },
      {
        id: "8.3",
        text: "Our people have been told how AI is expected to change their work, and there is training behind that so they stay ahead of it.",
        applicability: ALWAYS,
        action: {
          title: "Tell people how AI is expected to change their work",
          detail: "Say it openly, and put training behind it so they stay ahead of it.",
        },
      },
    ],
  },
];

/** Points 4 and 6. Derived rather than hard-coded so the two can never drift apart. */
export const RED_LINE_CONTROLS = CONTROLS.filter((c) => c.redLine).map((c) => c.number);

export const CONTROLS_BY_NUMBER = new Map(CONTROLS.map((c) => [c.number, c]));

export const ALL_SUB_STATEMENT_IDS = CONTROLS.flatMap((c) =>
  c.subStatements.map((s) => s.id),
);
