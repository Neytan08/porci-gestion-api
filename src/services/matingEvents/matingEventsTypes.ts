import type { PregnancyResult } from "./pregnancyRules";

export const REPRODUCTION_TYPES = {
  naturalMating: "Monta Natural",
  artificialInsemination: "Inseminación Artificial",
} as const;

export type ReproductionType =
  (typeof REPRODUCTION_TYPES)[keyof typeof REPRODUCTION_TYPES];

/** Scalar values accepted when registering a new mating workflow. */
export type CreateMatingEventInput = {
  sow_id: number;
  boar_id?: number;
  reproduction_date: Date;
  reproduction_type: ReproductionType;
  pregnancy_result: PregnancyResult;
  notes?: string;
};
