/**
 * Part 3: the AI usage policy template.
 *
 * ---------------------------------------------------------------------------
 * CANONICAL SOURCE CONTENT. DO NOT EDIT WITHOUT SIGN-OFF.
 *
 * Every heading and body string below is transcribed verbatim from "The AI
 * Bare Minimum Pack" by Karl George MBE, Part 3. Sections 3 and 8, and the
 * version history in section 17, are tables in the source and are modelled
 * as structured rows rather than flattened prose. Bracketed placeholders
 * (e.g. "[location]") are kept inline, exactly as written — see
 * ./brackets.ts for how they render.
 *
 * Changing any string here changes what the product tells organisations to
 * adopt. That is a content decision for Governance AI, not a code change.
 * See docs/spec/product-technical-spec.md section 9.
 * ---------------------------------------------------------------------------
 */

export const POLICY_TITLE = "AI usage policy template";
export const POLICY_STANDFIRST =
  "Adopt this as your own. Fill in the bracketed fields, approve it, issue it to everyone.";

export interface RoleRow {
  who: string;
  responsibilities: string;
}

export interface TransparencyRow {
  level: string;
  label: string;
  whatItMeans: string;
  whatYouDo: string;
}

export interface VersionRow {
  version: string;
  date: string;
  approvedBy: string;
  summaryOfChange: string;
}

export type PolicySection =
  | { number: number; heading: string; kind: "prose"; body: string[] }
  | {
      number: 3;
      heading: string;
      kind: "roles-table";
      rows: RoleRow[];
    }
  | {
      number: 8;
      heading: string;
      kind: "transparency-table";
      intro: string[];
      rows: TransparencyRow[];
    }
  | {
      number: 17;
      heading: string;
      kind: "review-table";
      body: string[];
      rows: VersionRow[];
    };

export const POLICY_SECTIONS: PolicySection[] = [
  {
    number: 1,
    heading: "Purpose and scope",
    kind: "prose",
    body: [
      "This policy sets out how [Organisation Name] uses artificial intelligence. It protects our clients, our data and our people, and it makes sure that a human being is always accountable for the work we produce.",
      "It applies to everyone who does work for us, in any capacity, on any device. It covers every AI tool, whether we pay for it, use it free, or receive it inside software we already own. That includes the AI features built into everyday products such as email, office software, video calls and search.",
      "This policy sits alongside our data protection, confidentiality, information security and disciplinary policies. Where any of those impose a stricter requirement, the stricter requirement applies.",
    ],
  },
  {
    number: 2,
    heading: "Our principles",
    kind: "prose",
    body: [
      "Human accountability. AI is a tool, and a person is always accountable for the output. Responsibility cannot be passed to a system.",
      "AI augments our people. We use AI to take the drudgery out of the work and to raise the quality of what we produce, so that our people spend their time on judgement, relationships and the things clients actually pay for. Where AI changes what a role involves, we will say so openly and put training behind it.",
      "Proportionate governance. The governance we apply is matched to the risk, so routine, low-impact work carries almost no process and substantive, high-impact work carries more.",
      "Data protection first. Client, personal and confidential information does not enter an AI tool unless that tool has been approved for it.",
      "Transparency. We tell people when AI has played a meaningful part in what we give them.",
      "Lawful and ethical use. We do not use AI to deceive, to discriminate, or to do anything we would be uncomfortable explaining to a client, a regulator or a journalist.",
    ],
  },
  {
    number: 3,
    heading: "Roles and responsibilities",
    kind: "roles-table",
    rows: [
      {
        who: "[Board / owner / senior team]",
        responsibilities:
          "Approving this policy, setting the risk appetite for AI, and receiving a report on AI use, risks and incidents at least quarterly.",
      },
      {
        who: "AI lead: [name, role]",
        responsibilities:
          "Maintaining the approved tools list and the AI register, answering requests for new tools, running training, and handling incidents.",
      },
      {
        who: "Managers",
        responsibilities:
          "Knowing how their teams use AI, reviewing and signing off AI-assisted work in their area, and escalating anything medium or high impact.",
      },
      {
        who: "Everyone",
        responsibilities:
          "Following this policy, verifying AI output before it leaves their hands, declaring AI use where required, and reporting incidents promptly.",
      },
    ],
  },
  {
    number: 4,
    heading: "Approved tools and the AI register",
    kind: "prose",
    body: [
      "Only tools on the approved AI tools list may be used for work. The list is held at [location] and states, for each tool, what it may be used for and which categories of data it may process.",
      "The AI lead maintains a register of every AI tool in use, recording the tool and provider, the teams using it, the purpose, whether it touches client, personal or confidential data, the data processing terms in place, and the approval decision and date. The register is reviewed quarterly.",
      "Before a tool is released for use, the AI lead configures the privacy settings, including chat history and any option to train the provider's models on our data. When someone leaves or changes role, the AI lead removes their access to approved tools and records that it has been done. Logins and seats are personal and are never shared.",
      "To request a new tool, contact the AI lead with what it does and what you would use it for. Requests are answered within [five working days]. Do not start using a tool, including a free trial or a beta feature, before the decision.",
    ],
  },
  {
    number: 5,
    heading: "Data: what may and may not go into an AI tool",
    kind: "prose",
    body: [
      "The following must never be entered into a public or unapproved AI tool:",
      "Client or customer information of any kind, including anything covered by a confidentiality agreement.",
      "Personal data, meaning anything that identifies a living individual, and special category data such as health, ethnicity or religious belief.",
      "Financial, commercial or strategic information that is not already public.",
      "Information about colleagues, candidates and job applicants, including CVs, references and performance notes.",
      "Passwords, credentials, security information or system configuration detail.",
      "Third-party material we do not have the right to share, including licensed content and other organisations' documents.",
      "Where an approved tool is cleared for a category of data, three things must be true before it is used: a written data processing agreement is in place, we have a lawful basis under UK GDPR for the processing, and any option to train the provider's models on our data has been switched off.",
      "Enter only what the task needs, which usually means a relevant paragraph instead of the whole file, and a summary instead of the client database.",
      "Check the client's contract, engagement terms or non-disclosure agreement before using AI on their work. Some clients require notice, some prohibit AI entirely, and many public sector and financial services contracts restrict sub-processing in ways that catch AI tools.",
      "Where a new AI use involves personal data on any scale, or produces a decision that affects individuals, complete a data protection impact assessment before it goes live.",
      "If in doubt",
      "Ask the AI lead before you paste rather than afterwards, because checking takes a minute and a data breach takes months, and it has to be reported to the Information Commissioner's Office within 72 hours.",
    ],
  },
  {
    number: 6,
    heading: "Shadow AI",
    kind: "prose",
    body: [
      "Shadow AI means using AI tools for work without the organisation knowing. It is the single most common way small organisations lose control of their information, and it is usually well intentioned.",
      "Personal AI accounts must not be used for work. If you are already using one, or a tool that has never been approved, tell the AI lead. Voluntary disclosure is treated as a governance matter to be resolved, not a disciplinary one.",
    ],
  },
  {
    number: 7,
    heading: "Human verification before release",
    kind: "prose",
    body: [
      "AI output is always a draft, and generative AI will fabricate facts, figures, quotations and references fluently enough that they read better than the real thing.",
      "Before any AI-assisted work leaves the organisation, the person responsible must verify the facts, figures and data, check that any citation, reference or quotation actually exists and says what the output claims, review the tone and content for bias or anything inappropriate, and edit it to our professional standard.",
      "Work that affects clients, customers, finances, legal or regulatory matters, or our reputation must also be reviewed and signed off by a suitably qualified second person before it is issued.",
    ],
  },
  {
    number: 8,
    heading: "Classifying AI contribution",
    kind: "transparency-table",
    intro: [
      "We use the AI Transparency Index™ to describe how much AI contributed to a piece of work. Classify at the highest level of contribution in the work product.",
    ],
    rows: [
      {
        level: "AI-0",
        label: "Human only",
        whatItMeans: "No AI used.",
        whatYouDo: "Nothing.",
      },
      {
        level: "AI-1",
        label: "AI-assisted",
        whatItMeans: "Spelling, grammar or formatting only.",
        whatYouDo: "Nothing.",
      },
      {
        level: "AI-2",
        label: "AI-supported",
        whatItMeans:
          "AI summarised, rephrased or helped you brainstorm. You authored the result.",
        whatYouDo: "A brief note on client-facing work.",
      },
      {
        level: "AI-3",
        label: "AI-partnered",
        whatItMeans:
          "AI generated substantive content that shaped the work. You directed and edited it.",
        whatYouDo: "Declaration on deliverables. Manager review for medium or high impact.",
      },
      {
        level: "AI-4",
        label: "AI-led",
        whatItMeans: "AI produced most of it. You commissioned, reviewed and validated.",
        whatYouDo: "Formal declaration. Management sign-off.",
      },
      {
        level: "AI-5",
        label: "AI-autonomous",
        whatItMeans: "An AI system produced it with autonomy. You provide oversight.",
        whatYouDo: "Formal declaration. Governance review. Audit trail.",
      },
    ],
  },
  {
    number: 9,
    heading: "Disclosure and transparency",
    kind: "prose",
    body: [
      "We maintain a standing AI statement on our website and an AI line in our email footer. Together these cover routine use, so individual emails need no classification.",
      'Beyond that, disclosure is proportionate to contribution. AI-2 client work carries a brief contextual note, such as: "AI tools were used to support the research and summarisation for this report." AI-3 work carries a methodology statement in the document itself. AI-4 and AI-5 work carries a fuller statement explaining what the AI did, what the human review covered, and what was verified.',
      "Where a client, funder or regulator sets its own AI disclosure requirements, theirs take precedence over ours.",
    ],
  },
  {
    number: 10,
    heading: "Meetings, note-takers and recording",
    kind: "prose",
    body: [
      "If an AI note-taker, transcription tool, meeting summary tool or AI assistant is active in a meeting involving anyone outside the organisation, it must be disclosed in the invitation and confirmed verbally before the meeting starts.",
      "Processing someone's voice through an AI tool needs a lawful basis and transparency under data protection law, so this is a legal requirement. If a participant objects, the tool is turned off.",
    ],
  },
  {
    number: 11,
    heading: "Intellectual property",
    kind: "prose",
    body: [
      "Do not upload material we do not own or have the right to use. Where AI has generated content, remember that ownership and copyright in AI output is unsettled in law, so do not rely on AI-generated material as a protectable asset, and do not present it as original third-party work.",
      "Check any AI-generated text, image or code for similarity to existing protected work before it is published or delivered.",
    ],
  },
  {
    number: 12,
    heading: "Acceptable use",
    kind: "prose",
    body: [
      "AI must not be used to produce deceptive content, including synthetic images, audio or video of real people; to make or materially influence a decision about a person, such as recruitment, performance, credit, eligibility or refusal of service, where UK GDPR gives people the right not to be subject to a decision based solely on automated processing that has legal or similarly significant effects, so a person makes the decision and records how they reached it; to produce discriminatory material; or to do anything unlawful or contrary to our values.",
      "Be sensible about waste too, avoiding repeated large jobs and unnecessary generation, because every query carries an energy cost.",
    ],
  },
  {
    number: 13,
    heading: "Training",
    kind: "prose",
    body: [
      "Everyone completes basic AI governance training before using AI for work, and a refresher at least annually. Training covers this policy, the data rules, verification, disclosure and incident reporting. It forms part of induction for new starters.",
      "Where the EU AI Act applies to us, Article 4 asks providers and deployers to support the development of AI literacy among their staff, and our training record is the evidence that we do. Section 14 sets out how far that takes us.",
    ],
  },
  {
    number: 14,
    heading: "Where this sits against the EU AI Act",
    kind: "prose",
    body: [
      "Most small UK organisations sit outside the EU AI Act altogether. It reaches you if you put an AI system on the EU market, if you deploy one inside the EU, or if the output of your AI use is used in the EU, so establish that first because the answer decides how much of the rest applies.",
      "Where we are in scope, this policy covers two obligations in principle. The AI literacy duty under Article 4, which has applied since 2 February 2025 and asks providers and deployers to support the development of AI literacy among their staff, is met through the training in section 13. The internal record-keeping and reporting expectations are met through the register in section 4 and the incident log in section 15.",
      "In principle is doing real work in that sentence. Full compliance needs a fuller review covering how our systems classify against the Act's risk tiers, the transparency duties under Article 50 that apply from 2 August 2026 with machine-readable marking of synthetic content following from 2 December 2026, and the high-risk obligations that the Digital Omnibus on AI, adopted in June 2026, deferred to 2 December 2027 for standalone systems and 2 August 2028 for AI embedded in regulated products. Penalties reach 35 million euro or 7% of global turnover for prohibited practices, so the scope question is worth answering properly.",
    ],
  },
  {
    number: 15,
    heading: "Incidents",
    kind: "prose",
    body: [
      "Report the following to [incident contact] the same day you become aware of it: information entered into an AI tool that should not have been; AI-generated errors that have reached a client or the public; biased or harmful output that has affected a person or a decision; use of an unapproved tool; and any work issued where AI use should have been declared and was not.",
      "The AI lead logs every incident, assesses whether it is also a personal data breach requiring notification to the Information Commissioner's Office within 72 hours, and reports incidents to [board / senior team] quarterly.",
    ],
  },
  {
    number: 16,
    heading: "If this policy is not followed",
    kind: "prose",
    body: [
      "An honest mistake or a misjudged classification is a training matter, and we would far rather hear about it.",
      "Failing to declare AI use on significant work, or using unapproved tools after a warning, is a conduct matter handled under the disciplinary policy. Deliberately concealing AI use, or denying it when asked, is treated as serious misconduct.",
    ],
  },
  {
    number: 17,
    heading: "Review",
    kind: "review-table",
    body: [
      "This policy is reviewed at least annually by [role], and sooner if regulation, our tools or our risks change materially. Register entries, training records, signed acknowledgements and the incident log are kept for at least [6] years. Version history is recorded below.",
    ],
    rows: [
      {
        version: "1.0",
        date: "[date]",
        approvedBy: "[name]",
        summaryOfChange: "First issue.",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Appendices
// ---------------------------------------------------------------------------

export const APPENDIX_A = {
  heading: "Appendix A: AI register template",
  intro: "Maintained by the AI lead. Reviewed quarterly.",
  columns: [
    "Tool and provider",
    "Used by",
    "Purpose",
    "Data it touches",
    "DPA in place",
    "Approved by / date",
  ],
};

export const APPENDIX_B = {
  heading: "Appendix B: acknowledgement",
  intro: "To be signed by every member of staff and retained by [role].",
  statement:
    "I confirm that I have read and understood the [Organisation Name] AI Usage Policy, that I will use only approved AI tools for work, that I will not enter confidential, client or personal data into unapproved tools, and that I will verify AI-assisted output before it leaves my hands.",
  signatureFields: ["Name", "Role", "Signature", "Date"],
};
