import { describe, expect, it } from "vitest";
import {
  isActiveBoar,
  isRemovalDateBeforeBirthDate,
  normalizeBoarTagNumber,
} from "../../../src/services/boars/boarsRules";

describe("boar rules", () => {
  it.each(["B 010", " b\t0\n10 "])("normalizes equivalent tag %j", (tag) => {
    expect(normalizeBoarTagNumber(tag)).toBe("b010");
  });
  it("retains meaningful punctuation and recognizes blank tags", () => {
    expect(normalizeBoarTagNumber(" B-010 ")).toBe("b-010");
    expect(normalizeBoarTagNumber(" \t\n")).toBe("");
  });
  it.each([
    [null, null, true],
    [new Date("2024-01-01"), null, false],
    [null, "retired", false],
  ] as const)(
    "classifies removal date %s and reason %s",
    (removal_date, removal_reason, active) => {
      expect(isActiveBoar({ removal_date, removal_reason })).toBe(active);
    },
  );
  it.each([
    ["2023-06-14", true],
    ["2023-06-15", false],
    ["2023-06-16", false],
  ] as const)("compares removal %s against birth", (date, before) => {
    expect(isRemovalDateBeforeBirthDate(new Date("2023-06-15"), new Date(date))).toBe(before);
  });
});
