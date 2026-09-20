/**
 * Normalizes boar tags for comparisons that ignore whitespace and casing.
 */
export const normalizeBoarTagNumber = (boarTagNumber: string) =>
  boarTagNumber.replace(/\s+/g, "").toLowerCase();

/** Checks whether a boar is still active; any recorded removal detail makes it inactive. */
export const isActiveBoar = (boar: { removal_date: Date | null; removal_reason: string | null }) =>
  boar.removal_date === null && boar.removal_reason === null;

/**
 * Checks whether a removal date happens before the boar birth date.
 */
export const isRemovalDateBeforeBirthDate = (birthDate: Date, removalDate: Date) =>
  removalDate.getTime() < birthDate.getTime();
