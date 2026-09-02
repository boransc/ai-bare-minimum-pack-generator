/**
 * Part 4: staff note, "Using AI at work".
 *
 * ---------------------------------------------------------------------------
 * CANONICAL SOURCE CONTENT. DO NOT EDIT WITHOUT SIGN-OFF.
 *
 * Every heading and body string below is transcribed verbatim from "The AI
 * Bare Minimum Pack" by Karl George MBE, Part 4. The "Where to find things"
 * and "Do and don't at a glance" tables are modelled as structured rows.
 * Bracketed placeholders (e.g. "[AI lead]") are kept inline, exactly as
 * written — see ./brackets.ts for how they render.
 *
 * Changing any string here changes what the product tells staff to do. That
 * is a content decision for Governance AI, not a code change. See
 * docs/spec/product-technical-spec.md section 9.
 * ---------------------------------------------------------------------------
 */

export const STAFF_NOTE_TITLE = "Staff note: using AI at work";
export const STAFF_NOTE_STANDFIRST =
  "Send this to everyone on the day the policy is approved. The last page is a do and don't sheet to print and pin up.";

export const STAFF_NOTE_INTRO = [
  "Most of you are already using AI, and in many cases it is making good work faster, so we are keeping it and putting five simple rules around it so that none of us gets caught out.",
  "Let me be clear about what this is for. AI is here to take the grind out of the work so that you spend more of your day on judgement, on clients and on the parts of the job that need a person. Where it changes what your role involves, we will tell you and we will train you.",
  "Read it once, which should take about three minutes, and the full policy sits behind it if you want the detail.",
];

export const ONE_LINE_SUMMARY = {
  heading: "The whole thing in one line",
  text: "Use approved tools, keep our data out of them unless they are cleared for it, check everything before it leaves your hands, say when AI helped, and tell us straight away if something goes wrong.",
};

export interface StaffNoteRule {
  number: 1 | 2 | 3 | 4 | 5;
  heading: string;
  body: string[];
}

export const FIVE_RULES_HEADING = "The five rules";

export const FIVE_RULES: StaffNoteRule[] = [
  {
    number: 1,
    heading: "Use the tools on the approved list",
    body: [
      "The approved list is at [location], and those tools have been checked for how they handle our data and what they do with it.",
      "If you want to use something that is not on the list, ask [AI lead] first. You will get an answer within [five working days]. Please do not sign up for a free trial and start feeding it work in the meantime.",
    ],
  },
  {
    number: 2,
    heading: "Never paste in anything you would not email to a stranger",
    body: [
      "Client information, personal data, financial detail, anything commercially sensitive and anything covered by an NDA all stay out of public AI tools.",
      "Some approved tools are cleared for some of this and the approved list tells you which, so if you are unsure, ask before you paste.",
    ],
  },
  {
    number: 3,
    heading: "Check it before it goes out",
    body: [
      "AI makes things up, and it does it confidently, inventing statistics, quotations, case references, legal citations and names of people who never existed. It reads beautifully and it is wrong.",
      "So verify the facts, the figures, the names and the sources, and if it is going to a client, a customer, a regulator or the board, somebody qualified checks it and puts their name to it. You are accountable for what you send.",
    ],
  },
  {
    number: 4,
    heading: "Say when AI helped",
    body: [
      "A grammar check or a bit of tidying up needs nothing said, because that is normal professional practice.",
      "Where AI has done real work on something a client sees, add a line saying so. And if you are running an AI note-taker or transcription tool in a meeting with anyone external, tell them in the invitation and say it out loud at the start, because that one is a legal requirement.",
    ],
  },
  {
    number: 5,
    heading: "Tell us if something goes wrong",
    body: [
      "If you think data has gone somewhere it should not have, if AI output has gone out with an error in it, or if something an AI tool produced looks biased or plain wrong, tell [incident contact] the same day.",
      "Nobody gets in trouble for an honest mistake reported early. The organisations badly damaged by AI were damaged by the concealment that followed the error.",
    ],
  },
];

export const WHAT_YOU_DO_NOT_NEED_TO_DO = {
  heading: "What you do not need to do",
  intro: "Governance here is proportionate to risk, and most of your work carries very little.",
  items: [
    "No forms for spell-checking, grammar or formatting.",
    "No approval needed for everyday drafting, summarising or research using approved tools with no sensitive data.",
    "No logging of every prompt, and nobody is monitoring your keystrokes.",
    "No permission needed to experiment and learn on non-sensitive material.",
  ],
  outro:
    "If the process ever feels heavier than the task deserves, say so. A rule people work around is worse than no rule at all.",
};

export const AMNESTY = {
  heading: "One amnesty, then we move on",
  body: [
    "If you have been using a personal AI account for work, or a tool nobody approved, tell [AI lead] by [date], and that is the end of it, with no blame and no note on file.",
    "We simply need to know what is being used and where our information has gone, before somebody outside the organisation tells us first.",
  ],
};

export interface WhereToFindRow {
  what: string;
  where: string;
}

export const WHERE_TO_FIND_THINGS = {
  heading: "Where to find things",
  rows: [
    { what: "AI usage policy", where: "[location]" },
    { what: "Approved AI tools list", where: "[location]" },
    { what: "Request a new tool", where: "[AI lead name and contact]" },
    { what: "Report an AI incident", where: "[incident contact and route]" },
    { what: "Training session", where: "[date, time, format]" },
  ] as WhereToFindRow[],
};

export const STAFF_NOTE_SIGN_OFF = {
  closing: "Thank you for reading it, and please ask me about anything you are unsure of.",
  name: "[Name]",
  /** Verbatim "[Role], [Organisation Name]". */
  roleLine: "[Role], [Organisation Name]",
};

export interface DoDontPair {
  doText: string;
  dontText: string;
}

export const DO_DONT_AT_A_GLANCE = {
  heading: "Do and don't at a glance",
  standfirst: "Print this page and keep it where you work.",
  pairs: [
    {
      doText: "Use tools from the approved list, and ask before you try a new one.",
      dontText:
        "Put client, personal, financial or confidential information into a public or unapproved tool.",
    },
    {
      doText:
        "Check the client's contract or NDA before using AI on their work, because some clients want notice and some rule it out.",
      dontText: "Paste in information about a colleague, a candidate or an applicant, CVs included.",
    },
    {
      doText: "Enter only what the task needs, usually a paragraph instead of the whole file.",
      dontText: "Use a personal AI account for work, or share your login or seat with someone else.",
    },
    {
      doText:
        "Turn off chat history and model training in the tool settings wherever that option exists.",
      dontText: "Start a free trial and feed it work while approval is still pending.",
    },
    {
      doText:
        "Treat every output as a draft, and check facts, figures, names and sources against something reliable.",
      dontText: "Use AI on a client's work where their contract or NDA rules it out.",
    },
    {
      doText: "Test anything that calculates, such as a formula or a piece of code, before you rely on it.",
      dontText: "Treat AI output as a source of truth for legal, financial, client or strategic decisions.",
    },
    {
      doText: "Keep the decision with a person wherever it affects someone's job, money or rights.",
      dontText:
        "Let AI make or materially shape a decision about a person, such as recruitment, performance, discipline, credit or eligibility.",
    },
    {
      doText: "Be able to explain the output in your own words before you put your name to it.",
      dontText: "Send AI-assisted client work out without a qualified person checking it.",
    },
    {
      doText: "Say when AI has done real work on something a client sees.",
      dontText: "Upload material we do not own or have the right to share.",
    },
    {
      doText: "Tell external participants before an AI note-taker or transcription tool joins the meeting.",
      dontText: "Assume AI-generated text or images are free of someone else's copyright.",
    },
    {
      doText: "Ask [AI lead] when you are unsure, before you paste rather than after.",
      dontText: "Run a note-taker in an external meeting without saying so.",
    },
    {
      doText: "Report anything that looks wrong, biased or leaked, the same day.",
      dontText: "Produce anything deceptive, discriminatory, or that you would struggle to explain to a client.",
    },
    {
      doText: "Use AI to get started and to think, then apply your own judgement.",
      dontText: "Hide a mistake, because the cover-up always costs more than the disclosure.",
    },
  ] as DoDontPair[],
};
