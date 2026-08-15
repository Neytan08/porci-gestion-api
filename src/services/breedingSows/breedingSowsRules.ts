export const BREEDING_SOW_STATUSES = {
  vacia: "Vacia",
  gestacion: "Gestación",
  lactancia: "Lactancia",
  noProductiva: "No Productiva",
  retirada: "Retirada",
} as const;

export type BreedingSowStatus = (typeof BREEDING_SOW_STATUSES)[keyof typeof BREEDING_SOW_STATUSES];

const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

/**
 * Normalizes sow tags for comparisons that ignore whitespace and casing.
 */
export const normalizeSowTagNumber = (sowTagNumber: string) =>
  sowTagNumber.replace(/\s+/g, "").toLowerCase();

/**
 * Converts user-facing status input into the canonical value stored by the API.
 */
export const parseBreedingSowStatus = (status: string): BreedingSowStatus | null => {
  switch (normalizeText(status)) {
    case "gestacion":
      return BREEDING_SOW_STATUSES.gestacion;
    case "lactancia":
      return BREEDING_SOW_STATUSES.lactancia;
    case "vacia":
      return BREEDING_SOW_STATUSES.vacia;
    case "no productiva":
      return BREEDING_SOW_STATUSES.noProductiva;
    default:
      return null;
  }
};

/**
 * Compares date-like values only when both sides contain a date.
 */
export const isBeforeDate = (leftDate: unknown, rightDate: unknown) => {
  if (
    !(typeof leftDate === "string" || leftDate instanceof Date) ||
    !(typeof rightDate === "string" || rightDate instanceof Date)
  ) {
    return false;
  }

  return new Date(leftDate).getTime() < new Date(rightDate).getTime();
};
