import { describe, expect, it } from "vitest";
import { generateToken, isValidToken } from "./token";

describe("generateToken", () => {
  it("produces a base64url string with at least 128 bits of entropy", () => {
    const token = generateToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(token.length).toBeGreaterThanOrEqual(22);
  });

  it("does not repeat across calls", () => {
    const tokens = new Set(Array.from({ length: 50 }, () => generateToken()));
    expect(tokens.size).toBe(50);
  });

  it("round-trips through its own validator", () => {
    expect(isValidToken(generateToken())).toBe(true);
  });
});

describe("isValidToken", () => {
  it("rejects malformed input before it would ever reach KV", () => {
    expect(isValidToken("")).toBe(false);
    expect(isValidToken("short")).toBe(false);
    expect(isValidToken("has a space in it 1234567")).toBe(false);
    expect(isValidToken("has/a/slash-in-it-1234567")).toBe(false);
    expect(isValidToken("has+a+plus+in+it+1234567")).toBe(false);
    expect(isValidToken("<script>alert(1)</script>")).toBe(false);
  });

  it("accepts a plausible base64url token", () => {
    expect(isValidToken("abcDEF123_-abcDEF123_-")).toBe(true);
  });
});
