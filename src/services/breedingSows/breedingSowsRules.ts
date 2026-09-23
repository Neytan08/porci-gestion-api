export const BREEDING_SOW_STATUSES = {
  vacia: "Vacia",
  gestacion: "Gestación",
  lactancia: "Lactancia",
  noProductiva: "No Productiva",
  retirada: "Retirada",
} as const;

export type BreedingSowStatus = (typeof BREEDING_SOW_STATUSES)[keyof typeof BREEDING_SOW_STATUSES];

const BREEDING_SOW_STATUS_ORDER: Readonly<Record<string, number>> = {
  [BREEDING_SOW_STATUSES.gestacion]: 0,
  [BREEDING_SOW_STATUSES.lactancia]: 1,
  [BREEDING_SOW_STATUSES.vacia]: 2,
  [BREEDING_SOW_STATUSES.noProductiva]: 3,
};

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

/** Checks whether a status can be assigned when first registering a sow. */
export const isAllowedBreedingSowCreationStatus = (
  status: BreedingSowStatus,
): status is
  | typeof BREEDING_SOW_STATUSES.vacia
  | typeof BREEDING_SOW_STATUSES.noProductiva =>
  status === BREEDING_SOW_STATUSES.vacia || status === BREEDING_SOW_STATUSES.noProductiva;

/** Resolves the list priority for active sow statuses. */
export const getBreedingSowStatusOrder = (status: string | null) => {
  if (status === null) {
    return Number.MAX_SAFE_INTEGER;
  }

  return BREEDING_SOW_STATUS_ORDER[status] ?? Number.MAX_SAFE_INTEGER;
};

/** Identifies records that have already entered the permanent retirement workflow. */
export const isRetiredBreedingSow = (sow: {
  status: string | null;
  removal_date: Date | null;
}) => sow.status === BREEDING_SOW_STATUSES.retirada || sow.removal_date !== null;

/**
 * Converts user-facing status input into the canonical value stored by the API.
 */
export const parseBreedingSowStatus = (
  status: string,
): Exclude<BreedingSowStatus, typeof BREEDING_SOW_STATUSES.retirada> | null => {
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
