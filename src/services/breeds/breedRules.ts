/**
 * Normalizes breed names so uniqueness checks ignore casing and repeated spaces.
 */
export const normalizeBreedName = (breedName: string) =>
  breedName.replace(/\s+/g, " ").trim().toLowerCase();
