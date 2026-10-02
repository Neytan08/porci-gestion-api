/** Scalar values accepted after validating a new farrowing request. */
export type CreateFarrowingInput = {
  sow_id: number;
  farrowing_date: Date;
  male_piglets: number;
  female_piglets: number;
  still_births: number;
  mummies: number;
  notes?: string;
};

/** Values accepted when completing the normal weaning workflow. */
export type WeanFarrowingInput = {
  weaned_date: Date;
  weaned_piglets: number;
};
