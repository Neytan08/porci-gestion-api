/**
 * Normalizes boar tags for comparisons that ignore whitespace and casing.
 */
export const normalizeBoarTagNumber = (boarTagNumber: string) =>
  boarTagNumber.replace(/\s+/g, "").toLowerCase();

/**
 * Identifies date-like values before applying chronological business rules.
 */
export const hasBoarDateValue = (value: unknown): value is string | Date =>
  typeof value === "string" || value instanceof Date;

/**
 * Checks whether a removal date happens before the boar birth date.
 */
export const isRemovalDateBeforeBirthDate = (birthDate: unknown, removalDate: unknown) => {
  if (!hasBoarDateValue(birthDate) || !hasBoarDateValue(removalDate)) {
    return false;
  }

  return new Date(removalDate).getTime() < new Date(birthDate).getTime();
};
