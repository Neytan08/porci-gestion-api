import { describe, expect, it } from "vitest";
import {
  BREEDING_SOW_STATUSES as statuses,
  isAllowedBreedingSowCreationStatus,
  isBeforeDate,
  isRetiredBreedingSow,
  normalizeSowTagNumber,
  parseBreedingSowStatus,
} from "../../../src/services/breedingSows/breedingSowsRules";

describe("breeding sow rules", () => {
  it("ignores casing and whitespace in tags while retaining punctuation", () => {
    for (const tag of ["S 010", " s\t0\n10 "]) {
      expect(normalizeSowTagNumber(tag)).toBe("s010");
    }
    expect(normalizeSowTagNumber(" S-010 ")).toBe("s-010");
    expect(normalizeSowTagNumber(" \t\n")).toBe("");
  });

  it("allows only empty or nonproductive initial states", () => {
    for (const status of Object.values(statuses)) {
      expect(isAllowedBreedingSowCreationStatus(status)).toBe(
        status === statuses.vacia || status === statuses.noProductiva,
      );
    }
  });

  it("resolves supported status input and excludes retirement from manual selection", () => {
    for (const [input, canonical] of [
      [" VACÍA ", statuses.vacia],
      [" gestacion ", statuses.gestacion],
      ["LACTANCIA", statuses.lactancia],
      [" no productiva ", statuses.noProductiva],
    ]) {
      expect(parseBreedingSowStatus(input)).toBe(canonical);
    }
    for (const input of [statuses.retirada, "unknown", ""]) {
      expect(parseBreedingSowStatus(input)).toBeNull();
    }
  });

  it("recognizes retirement by status or removal date", () => {
    expect(isRetiredBreedingSow({ status: statuses.retirada, removal_date: null })).toBe(true);
    expect(isRetiredBreedingSow({ status: statuses.vacia, removal_date: new Date() })).toBe(true);
    expect(isRetiredBreedingSow({ status: statuses.vacia, removal_date: null })).toBe(false);
    expect(isRetiredBreedingSow({ status: statuses.lactancia, removal_date: null })).toBe(false);
  });

  it("compares present dates strictly and permits equal or absent dates", () => {
    const entry = new Date("2023-01-01");
    expect(isBeforeDate(new Date("2022-12-31"), entry)).toBe(true);
    expect(isBeforeDate("2022-12-31", "2023-01-01")).toBe(true);
    expect(isBeforeDate(entry, entry)).toBe(false);
    expect(isBeforeDate(new Date("2023-01-02"), entry)).toBe(false);
    expect(isBeforeDate(null, entry)).toBe(false);
    expect(isBeforeDate(entry, undefined)).toBe(false);
  });
});
