import { describe, expect, it } from "vitest";
import { PACK_FOOTER } from "@/content/v1/guidance";
import { POLICY_SECTIONS } from "@/content/v1/policy";
import { buildPolicyDocument, buildStaffNoteDocument } from "./word-document";

describe("buildPolicyDocument", () => {
  it("shows a filled field as its value, and an unfilled one as its literal bracket", () => {
    const html = buildPolicyDocument({
      orgName: "Acme Ltd",
      fields: { location: "the shared drive" },
    });

    expect(html).toContain("the shared drive");
    expect(html).not.toContain("[location]");

    // incidentContact was never filled in.
    expect(html).toContain("[incident contact]");
  });

  it("substitutes [Organisation Name] when a name is given, and leaves it a bracket otherwise", () => {
    const withName = buildPolicyDocument({ orgName: "Acme Ltd", fields: {} });
    expect(withName).toContain("Acme Ltd");
    expect(withName).not.toContain("[Organisation Name]");

    const withoutName = buildPolicyDocument({ orgName: null, fields: {} });
    expect(withoutName).toContain("[Organisation Name]");
  });

  it("escapes an HTML-bearing field value rather than emitting it raw", () => {
    const html = buildPolicyDocument({
      orgName: null,
      fields: { location: "<script>alert(1)</script>" },
    });

    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  it("escapes an HTML-bearing organisation name", () => {
    const html = buildPolicyDocument({
      orgName: "<script>alert(1)</script>",
      fields: {},
    });

    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  it("contains the disclaimer and trademark lines", () => {
    const html = buildPolicyDocument({ orgName: null, fields: {} });
    expect(html).toContain(PACK_FOOTER.disclaimer);
    expect(html).toContain(PACK_FOOTER.trademarks);
  });

  it("contains all 17 section headings, in order", () => {
    const html = buildPolicyDocument({ orgName: null, fields: {} });
    const positions = POLICY_SECTIONS.map((section) => {
      const marker = `${section.number}. ${section.heading}`;
      const index = html.indexOf(marker);
      expect(index).toBeGreaterThan(-1);
      return index;
    });

    expect(POLICY_SECTIONS).toHaveLength(17);
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i]).toBeGreaterThan(positions[i - 1]);
    }
  });
});

describe("buildStaffNoteDocument", () => {
  it("shows a filled field as its value, and an unfilled one as its literal bracket", () => {
    const html = buildStaffNoteDocument({
      orgName: "Acme Ltd",
      fields: { aiLead: "Priya" },
    });

    expect(html).toContain("Priya");
    expect(html).not.toContain("[AI lead]");
    expect(html).toContain("[incident contact]");
  });

  it("escapes an HTML-bearing field value rather than emitting it raw", () => {
    const html = buildStaffNoteDocument({
      orgName: null,
      fields: { aiLead: "<script>alert(1)</script>" },
    });

    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  it("contains the disclaimer and trademark lines", () => {
    const html = buildStaffNoteDocument({ orgName: null, fields: {} });
    expect(html).toContain(PACK_FOOTER.disclaimer);
    expect(html).toContain(PACK_FOOTER.trademarks);
  });
});

describe("HTML well-formedness", () => {
  // Guards the escaping of the literal prose *between* brackets, which is not
  // otherwise covered: content/v1 currently contains no "&" or "<", so a
  // regression there would be invisible until someone added "R&D" to the
  // policy and a client opened a document full of broken entities.
  it.each([
    ["policy", buildPolicyDocument],
    ["staff note", buildStaffNoteDocument],
  ])("emits every ampersand in the %s as a real entity", (_label, build) => {
    const html = build({
      orgName: "Ampersand & Co <Ltd>",
      fields: { location: "R&D share", aiLead: "Jo & Sam" },
    });

    const stray = [...html.matchAll(/&(?!(?:[a-zA-Z][a-zA-Z0-9]{1,10}|#\d{1,6}|#x[0-9a-fA-F]{1,6});)/g)];
    expect(stray.map((m) => html.slice(m.index, m.index + 24))).toEqual([]);
  });
});
