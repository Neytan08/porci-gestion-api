import { describe, expect, it } from "vitest";
import {
  isFarrowingCompletionDateValid,
  isFarrowingDateAfterReproductionDate,
} from "../../../src/services/farrowings/farrowingsRules";

describe("farrowing chronology rules", () => {
  it("requires farrowing strictly after reproduction", () => {
    const reproduction = new Date("2024-01-01");
    expect(isFarrowingDateAfterReproductionDate(new Date("2023-12-31"), reproduction)).toBe(false);
    expect(isFarrowingDateAfterReproductionDate(reproduction, reproduction)).toBe(false);
    expect(isFarrowingDateAfterReproductionDate(new Date("2024-01-02"), reproduction)).toBe(true);
  });

  it("allows weaning or retirement closure on or after farrowing", () => {
    const farrowing = new Date("2024-05-01");
    expect(isFarrowingCompletionDateValid(new Date("2024-04-30"), farrowing)).toBe(false);
    expect(isFarrowingCompletionDateValid(farrowing, farrowing)).toBe(true);
    expect(isFarrowingCompletionDateValid(new Date("2024-05-02"), farrowing)).toBe(true);
  });
});
