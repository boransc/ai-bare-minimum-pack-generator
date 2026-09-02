import { describe, expect, it } from "vitest";
import { isValidEmail, MAX_EMAIL_LENGTH } from "./validate";

describe("isValidEmail", () => {
  it("accepts an ordinary address", () => {
    expect(isValidEmail("person@example.com")).toBe(true);
  });

  it("accepts a plus-tagged, subdomained address", () => {
    expect(isValidEmail("person+tag@mail.example.co.uk")).toBe(true);
  });

  it("rejects an empty string", () => {
    expect(isValidEmail("")).toBe(false);
  });

  it("rejects a value with no @", () => {
    expect(isValidEmail("person.example.com")).toBe(false);
  });

  it("rejects a value with no domain dot", () => {
    expect(isValidEmail("person@example")).toBe(false);
  });

  it("rejects whitespace inside the address", () => {
    expect(isValidEmail("person @example.com")).toBe(false);
    expect(isValidEmail("person@ example.com")).toBe(false);
  });

  it("rejects multiple @ signs", () => {
    expect(isValidEmail("person@@example.com")).toBe(false);
  });

  it("accepts an address right at the length cap", () => {
    // "a...a@example.com" sized to land exactly on MAX_EMAIL_LENGTH.
    const local = "a".repeat(MAX_EMAIL_LENGTH - "@example.com".length);
    const address = `${local}@example.com`;
    expect(address.length).toBe(MAX_EMAIL_LENGTH);
    expect(isValidEmail(address)).toBe(true);
  });

  it("rejects an address one character past the length cap", () => {
    const local = "a".repeat(MAX_EMAIL_LENGTH - "@example.com".length + 1);
    const address = `${local}@example.com`;
    expect(address.length).toBe(MAX_EMAIL_LENGTH + 1);
    expect(isValidEmail(address)).toBe(false);
  });

  it("rejects a value that is not even email-shaped, e.g. a pasted sentence", () => {
    expect(isValidEmail("please send this to my work email thanks")).toBe(false);
  });
});
