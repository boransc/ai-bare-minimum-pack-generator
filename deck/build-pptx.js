/**
 * Builds the five-slide deck as a real .pptx.
 *
 * Palette is the product's own (app/globals.css), so the deck and the thing
 * being demoed read as one object:
 *   paper F6F5F0 · ink 172724 · ink-soft 43534E · muted 61706B
 *   forest 1E5146 · mint DFECE6 · gold-text 8F6520 · red 8C2A2A
 *
 * Two deliberate departures from the published canvas:
 *
 *  1. No gold rules under the standfirsts, and no green top-border on the
 *     chosen option in slide 4. Both are the accent-stripe pattern that reads
 *     as generated filler in a slide deck. The chosen option is marked with a
 *     mint tint instead, which says the same thing without the stripe.
 *
 *  2. Cambria and Calibri rather than Source Serif 4 and Manrope. The real
 *     faces are webfonts and will not be on the presenting machine, so
 *     PowerPoint would substitute something arbitrary. Cambria ships with
 *     Office and is a transitional serif of similar weight and axis. Consolas
 *     appears only on the fixed short labels, where nothing can overflow.
 *
 * Red is used exactly once, on slide 2, matching the product's own rule that
 * seeing red means one thing: a failed red line. Slide 5's "does not" is
 * deliberately NOT red -- spending it there would spend that meaning.
 */

const pptxgen = require("pptxgenjs");

const INK = "172724";
const INK_SOFT = "43534E";
const MUTED = "61706B";
const PAPER = "F6F5F0";
const WHITE = "FFFEFA";
const FOREST = "1E5146";
const MINT = "DFECE6";
const GOLD_TEXT = "8F6520";
const RED = "8C2A2A";
const MINT_SOFT = "A8C7BC";

const SERIF = "Cambria";
const SANS = "Calibri";
const MONO = "Consolas";

const M = 1.0; // left/right margin, inches
const W = 13.333;
const CONTENT_W = W - M * 2;

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // must precede addSlide: default is 10in wide
pres.author = "Governance AI";
pres.title = "AI Minimum in Five Minutes";

/** Small uppercase label. Fresh object each call: pptxgenjs mutates options. */
function label(slide, text, opts) {
  slide.addText(text, {
    isTextBox: true,
    fontFace: MONO,
    fontSize: 10,
    charSpacing: 1.6,
    color: opts.color,
    x: opts.x,
    y: opts.y,
    w: opts.w,
    h: opts.h || 0.3,
    margin: 0,
    align: opts.align || "left",
    valign: "middle",
  });
}

function slideNumber(slide, n, color) {
  label(slide, `0${n} / 05`, { color, x: W - M - 2, y: 6.72, w: 2, align: "right" });
}

// ---------------------------------------------------------------------------
// 1 — What it is
// ---------------------------------------------------------------------------
const s1 = pres.addSlide();
s1.background = { color: PAPER };

s1.addShape(pres.ShapeType.ellipse, {
  x: M, y: 0.62, w: 0.34, h: 0.34, fill: { color: FOREST },
});
s1.addText("G", {
  isTextBox: true, x: M, y: 0.62, w: 0.34, h: 0.34, margin: 0,
  fontFace: SERIF, fontSize: 15, bold: true, color: WHITE,
  align: "center", valign: "middle",
});
label(s1, "GOVERNANCE AI", { color: MUTED, x: M + 0.48, y: 0.64, w: 4 });

s1.addText(
  "A small charity can find out in ten minutes whether it meets the AI minimum — and leave with the paperwork to fix it.",
  {
    isTextBox: true, x: M, y: 1.9, w: CONTENT_W - 0.6, h: 3.3, margin: 0,
    fontFace: SERIF, fontSize: 40, color: INK, lineSpacingMultiple: 1.06,
    valign: "top",
  },
);

s1.addText("Built on The AI Bare Minimum Pack.", {
  isTextBox: true, x: M, y: 5.5, w: 7, h: 0.4, margin: 0,
  fontFace: SANS, fontSize: 16, color: INK_SOFT, valign: "middle",
});

slideNumber(s1, 1, MUTED);
s1.addNotes(`A small charity can find out in ten minutes whether it meets the basic standard for using AI safely, and walk away with the paperwork to fix what is missing.

The content is not mine. It is The AI Bare Minimum Pack, from Governance AI. It was a Word document. Now it is a website that adapts itself to whoever is filling it in.`);

// ---------------------------------------------------------------------------
// 2 — The problem. Large stat callout.
// ---------------------------------------------------------------------------
const s2 = pres.addSlide();
s2.background = { color: PAPER };

s2.addText("A real result from testing the live site.", {
  isTextBox: true, x: M, y: 0.75, w: 8, h: 0.45, margin: 0,
  fontFace: SANS, fontSize: 17, color: INK_SOFT, valign: "middle",
});

s2.addText(
  [
    { text: "6", options: { color: INK } },
    { text: "/8", options: { color: MUTED } },
  ],
  {
    isTextBox: true, x: M, y: 1.55, w: 5.1, h: 3.1, margin: 0,
    fontFace: SERIF, fontSize: 132, valign: "middle", align: "left",
  },
);
label(s2, "POINTS EVIDENCED", { color: GOLD_TEXT, x: M, y: 4.8, w: 5 });

s2.addText("The minimum\nis not met.", {
  isTextBox: true, x: 6.5, y: 1.7, w: 5.83, h: 1.9, margin: 0,
  fontFace: SERIF, fontSize: 42, color: RED, lineSpacingMultiple: 1.06,
  valign: "top",
});
s2.addText(
  "Two of the eight points are red lines. Fail either one and the total stops mattering.",
  {
    isTextBox: true, x: 6.5, y: 3.85, w: 5.6, h: 1.5, margin: 0,
    fontFace: SANS, fontSize: 17, color: INK_SOFT, lineSpacingMultiple: 1.4,
    valign: "top",
  },
);

s2.addText("A score that flatters you is worse than no score at all.", {
  isTextBox: true, x: M, y: 5.95, w: 8.9, h: 0.55, margin: 0,
  fontFace: SERIF, fontSize: 21, italic: true, color: INK, valign: "middle",
});

slideNumber(s2, 2, MUTED);
s2.addNotes(`A real result from testing the live site.

Six out of eight. Seventy-five per cent.

The product says the minimum is not met.

Two of those eight points are not like the other six. One is whether you have written down what staff must never type into an AI tool. The other is whether a human checks AI work before it reaches a client. Fail either one and the total stops mattering. You do not meet the minimum, and the page says so above the score.

That is why this is a product and not a quiz. A quiz would have told that organisation it got seventy-five per cent and left it feeling fine.`);

// ---------------------------------------------------------------------------
// 3 — Demo. Inverted: the one slide the room should look away from.
// ---------------------------------------------------------------------------
const s3 = pres.addSlide();
s3.background = { color: FOREST };

label(s3, "NINETY SECONDS", { color: MINT_SOFT, x: M, y: 0.75, w: 5 });

s3.addText("Live.", {
  isTextBox: true, x: M, y: 2.3, w: 8, h: 1.9, margin: 0,
  fontFace: SERIF, fontSize: 96, color: WHITE, valign: "middle",
});

s3.addText("Eight questions, then the pack.", {
  isTextBox: true, x: M, y: 4.4, w: 8, h: 0.5, margin: 0,
  fontFace: SANS, fontSize: 18, color: MINT, valign: "middle",
});

s3.addText("ai-bare-minimum-pack-generator.vercel.app", {
  isTextBox: true, x: M, y: 6.6, w: 8, h: 0.4, margin: 0,
  fontFace: MONO, fontSize: 12, color: MINT_SOFT, valign: "middle",
});

slideNumber(s3, 3, MINT_SOFT);
s3.addNotes(`Let me show you.

Eight questions. The check. The pack. Verdict first, score second. Their sector and size change the wording, never the rules. The policy has blanks they fill in here and we save them, and it downloads as a Word file, because a locked PDF of a policy template is no use to anyone.`);

// ---------------------------------------------------------------------------
// 4 — The hardest decision. Comparison columns.
// ---------------------------------------------------------------------------
const s4 = pres.addSlide();
s4.background = { color: PAPER };

s4.addText("May the model write the policy?", {
  isTextBox: true, x: M, y: 0.7, w: 9.4, h: 1.5, margin: 0,
  fontFace: SERIF, fontSize: 44, color: INK, lineSpacingMultiple: 1.02,
  valign: "top",
});

const COL_W = 3.55;
const COL_GAP = 0.34;
const COL_Y = 2.75;
const COL_H = 2.15;
const options = [
  {
    head: "It writes the pack.",
    body: "Then it invents obligations that nobody wrote.",
    chosen: false,
  },
  {
    head: "It writes nothing.",
    body: "Then every organisation gets the same document.",
    chosen: false,
  },
  {
    head: "It writes the margins.",
    body: "Three short fields beside the fixed text.",
    chosen: true,
  },
];

options.forEach((opt, i) => {
  const x = M + i * (COL_W + COL_GAP);

  // A tint, not an edge stripe: the chosen column reads as chosen without a
  // border the eye has to interpret.
  if (opt.chosen) {
    s4.addShape(pres.ShapeType.rect, {
      x: x - 0.2, y: COL_Y - 0.32, w: COL_W + 0.4, h: COL_H + 0.5,
      fill: { color: MINT },
    });
  }

  s4.addText(opt.head, {
    isTextBox: true, x, y: COL_Y, w: COL_W, h: 0.62, margin: 0,
    fontFace: SERIF, fontSize: 25, color: opt.chosen ? INK : MUTED,
    lineSpacingMultiple: 1.1, valign: "top",
  });
  s4.addText(opt.body, {
    isTextBox: true, x, y: COL_Y + 0.74, w: COL_W, h: 1.0, margin: 0,
    fontFace: SANS, fontSize: 15, color: opt.chosen ? INK_SOFT : MUTED,
    lineSpacingMultiple: 1.32, valign: "top",
  });
  if (opt.chosen) {
    label(s4, "CHOSEN", { color: GOLD_TEXT, x, y: COL_Y + 1.85, w: COL_W });
  }
});

s4.addText(
  "It cannot state a requirement, because it is never given a field to put one in.",
  {
    isTextBox: true, x: M, y: 6.0, w: 10.2, h: 0.8, margin: 0,
    fontFace: SERIF, fontSize: 22, color: INK, lineSpacingMultiple: 1.2,
    valign: "middle",
  },
);

slideNumber(s4, 4, MUTED);
s4.addNotes(`The hardest question was whether to let the AI write the policy.

Three options.

Let it write the whole pack. Fast, and unusable. It invents obligations. It will tell a housing association it has thirty days to file a report that does not exist.

Let it write nothing. Safe, and every organisation gets an identical document, which they can already get free.

What I did instead is fix the Pack's words and let the AI write only in the margins. A paragraph describing their situation back to them. One realistic thing that could go wrong. One sentence for each point they failed.

The part I would defend hardest is this. It cannot state a rule, because there is nowhere to put one. And everything it writes is checked before it reaches the page, against a list of things it must never mention. Laws. Regulators. Deadlines. Numbers. If a passage fails, the original text shows instead, and the reader never sees a gap.`);

// ---------------------------------------------------------------------------
// 5 — Where it stands.
// ---------------------------------------------------------------------------
const s5 = pres.addSlide();
s5.background = { color: PAPER };

const rows = [
  {
    label: "WORKS",
    text: "The whole loop is live, and I have watched every step of it run.",
    dot: FOREST,
    color: INK,
  },
  {
    label: "DOES NOT",
    text: "Nobody has signed off that the transcription is faithful.",
    dot: MUTED,
    color: INK_SOFT,
  },
  {
    label: "NEXT",
    text: "Take it again in six months, and show the board 4 of 8 became 7.",
    dot: GOLD_TEXT,
    color: INK,
  },
];

// A repeated dot rather than a tinted row. The tint spanned the full content
// width and landed a tenth of an inch from the slide edge, which reads as a
// decorative header bar -- the thing to avoid -- and broke the margin. Three
// dots carry the same "these are three different states" signal, give the
// slide a motif, and cost no width.
const ROW_Y = 1.0;
const ROW_H = 1.45;
const ROW_GAP = 0.38;

rows.forEach((row, i) => {
  const y = ROW_Y + i * (ROW_H + ROW_GAP);

  s5.addShape(pres.ShapeType.ellipse, {
    x: M, y: y + ROW_H / 2 - 0.08, w: 0.16, h: 0.16, fill: { color: row.dot },
  });

  // Centred against the row, so the label sits on the statement's axis
  // instead of floating above it.
  label(s5, row.label, { color: GOLD_TEXT, x: M + 0.34, y, w: 1.7, h: ROW_H });

  s5.addText(row.text, {
    isTextBox: true, x: M + 2.15, y, w: CONTENT_W - 2.15, h: ROW_H, margin: 0,
    fontFace: SERIF, fontSize: 28, color: row.color, lineSpacingMultiple: 1.12,
    valign: "middle",
  });
});

// Narrower than the slide: at 9.5in wide this box overlapped the slide
// number's box, which is only ever safe by accident.
s5.addText("Until the words are signed off, it is a working prototype.", {
  isTextBox: true, x: M, y: 6.32, w: 8.8, h: 0.42, margin: 0,
  fontFace: SANS, fontSize: 16, color: INK_SOFT, valign: "middle",
});

slideNumber(s5, 5, MUTED);
s5.addNotes(`What works. The whole loop is live, and I have watched every step run on the deployed site, not just on my laptop.

What does not. Nobody has confirmed that my transcription of it is faithful. I typed that document into code carefully, and carefully is not signed off. Until someone does that, this is a working prototype.

What next. Let an organisation take the check again in six months. That is how a board watches four out of eight become seven, and it is the only real reason anyone comes back.`);

pres
  .writeFile({ fileName: "ai-minimum-five-minutes.pptx" })
  .then((f) => console.log("wrote " + f));
