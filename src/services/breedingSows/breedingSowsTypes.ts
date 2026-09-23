import type { BREEDING_SOW_STATUSES } from "./breedingSowsRules";

/** Scalar values accepted when registering a breeding sow and its imported history. */
export type CreateBreedingSowInput = {
  status:
    | typeof BREEDING_SOW_STATUSES.vacia
    | typeof BREEDING_SOW_STATUSES.noProductiva;
  breed_id: number;
  sow_tag_number: string;
  entry_date: Date;
  weight?: number | null;
  length?: number | null;
  mammary_glands: number;
  farrowing_number: number;
  description?: string | null;
};

/** Profile values that may change without taking ownership from reproductive workflows. */
export type UpdateBreedingSowInput = Partial<CreateBreedingSowInput>;
// export type UpdateBreedingSowInput = {
//   status?: Exclude<BreedingSowStatus, typeof BREEDING_SOW_STATUSES.retirada>;
//   breed_id?: number;
//   sow_tag_number?: string;
//   entry_date?: Date;
//   weight?: number | null;
//   length?: number | null;
//   mammary_glands?: number;
//   description?: string | null;
// };

/** Values supplied when permanently removing one or more sows from active workflows. */
export type RetireBreedingSowInput = {
  removal_date?: Date;
  removal_reason?: string | null;
};
