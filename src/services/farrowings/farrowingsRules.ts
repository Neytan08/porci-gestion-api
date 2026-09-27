/** Requires the farrowing to occur strictly after the mating event that produced it. */
export const isFarrowingDateAfterReproductionDate = (
  farrowingDate: Date,
  reproductionDate: Date,
) => farrowingDate.getTime() > reproductionDate.getTime();

/** Allows normal weaning or retirement closure on or after the farrowing date. */
export const isFarrowingCompletionDateValid = (
  completionDate: Date,
  farrowingDate: Date,
) => completionDate.getTime() >= farrowingDate.getTime();
