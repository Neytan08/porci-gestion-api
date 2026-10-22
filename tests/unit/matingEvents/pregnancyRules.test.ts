import { describe, expect, it } from "vitest";
import { BREEDING_SOW_STATUSES as statuses } from "../../../src/services/breedingSows/breedingSowsRules";
import {
  getSowStatusAfterDeletingMatingEvent,
  getSowStatusForCreatedMatingEvent,
  getSowStatusTransition,
  hasMinimumPostWeaningInterval,
  isEmptySowStatus,
  isReproductionDateOnOrAfterEntryDate,
  isSupportedPregnancyResultTransition,
  parsePregnancyResult,
  PREGNANCY_RESULTS as results,
} from "../../../src/services/matingEvents/pregnancyRules";

describe("mating pregnancy rules", () => {
  it("recognizes normalized domain labels and rejects unknown or nonempty states", () => {
    for (const result of Object.values(results)) {
      expect(parsePregnancyResult(` ${result.toUpperCase()} `)).toBe(result);
    }
    expect(parsePregnancyResult(" pósitivo ")).toBe(results.positivo);
    for (const input of ["", "unknown"]) expect(parsePregnancyResult(input)).toBeNull();
    for (const input of [" VACÍA ", "vacia"]) expect(isEmptySowStatus(input)).toBe(true);
    for (const status of Object.values(statuses).filter((status) => status !== statuses.vacia)) {
      expect(isEmptySowStatus(status)).toBe(false);
    }
    expect(isEmptySowStatus("unknown")).toBe(false);
  });

  it("allows the documented transitions with their required sow status effects", () => {
    expect(isSupportedPregnancyResultTransition(results.pendiente, results.positivo)).toBe(true);
    expect(getSowStatusTransition(results.pendiente, results.positivo)).toBe("gestacion");
    expect(isSupportedPregnancyResultTransition(results.pendiente, results.negativo)).toBe(true);
    expect(getSowStatusTransition(results.pendiente, results.negativo)).toBeNull();
    expect(isSupportedPregnancyResultTransition(results.positivo, results.negativo)).toBe(true);
    expect(getSowStatusTransition(results.positivo, results.negativo)).toBe("vacia");
  });

  it("rejects reverse and lifecycle transitions while treating identical results as no-ops", () => {
    for (const current of Object.values(results)) {
      expect(isSupportedPregnancyResultTransition(current, current)).toBe(true);
      expect(getSowStatusTransition(current, current)).toBeNull();
    }
    for (const [current, next] of [
      [results.positivo, results.pendiente],
      [results.negativo, results.pendiente],
      [results.negativo, results.positivo],
      [results.cancelado, results.positivo],
      [results.cerrado, results.positivo],
      [results.pendiente, results.cancelado],
      [results.positivo, results.cerrado],
    ] as const) {
      expect(isSupportedPregnancyResultTransition(current, next)).toBe(false);
    }
  });

  it("allows reproduction on or after entry but never before it", () => {
    const entry = new Date("2024-01-01");
    expect(isReproductionDateOnOrAfterEntryDate(new Date("2023-12-31"), entry)).toBe(false);
    expect(isReproductionDateOnOrAfterEntryDate(entry, entry)).toBe(true);
    expect(isReproductionDateOnOrAfterEntryDate(new Date("2024-01-02"), entry)).toBe(true);
  });

  it("requires five days after actual weaning without imposing an upper limit", () => {
    const weaning = new Date("2024-02-28");
    expect(hasMinimumPostWeaningInterval(weaning, null)).toBe(true);
    expect(hasMinimumPostWeaningInterval(new Date("2024-02-27"), weaning)).toBe(false);
    expect(hasMinimumPostWeaningInterval(new Date("2024-03-03"), weaning)).toBe(false);
    expect(hasMinimumPostWeaningInterval(new Date("2024-03-04"), weaning)).toBe(true);
    expect(hasMinimumPostWeaningInterval(new Date("2024-06-01"), weaning)).toBe(true);
  });

  it("changes sow status on creation or deletion only for a positive pregnancy", () => {
    for (const result of [results.positivo, " POSITIVO ", "pósitivo"]) {
      expect(getSowStatusForCreatedMatingEvent(result)).toBe(statuses.gestacion);
      expect(getSowStatusAfterDeletingMatingEvent(result)).toBe("vacia");
    }
    for (const result of [
      results.pendiente,
      results.negativo,
      results.cancelado,
      results.cerrado,
      null,
      "unknown",
      "",
    ]) {
      expect(getSowStatusForCreatedMatingEvent(result)).toBeNull();
      expect(getSowStatusAfterDeletingMatingEvent(result)).toBeNull();
    }
  });
});
