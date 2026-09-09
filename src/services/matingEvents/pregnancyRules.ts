import { BREEDING_SOW_STATUSES } from "../breedingSows/breedingSowsRules";

export const PREGNANCY_RESULTS = {
  pendiente: "Pendiente",
  positivo: "Positivo",
  negativo: "Negativo",
  cancelado: "Cancelado",
  cerrado: "Cerrado",
} as const;

export type PregnancyResult = (typeof PREGNANCY_RESULTS)[keyof typeof PREGNANCY_RESULTS];
export type SowStatusKey = keyof typeof BREEDING_SOW_STATUSES;

/**
 * Normalizes user-facing labels so rule evaluation stays case- and accent-insensitive.
 */
const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

/**
 * Checks whether the sow is still in the empty state required to register a mating event.
 */
export const isEmptySowStatus = (statusName: string) => normalizeText(statusName) === normalizeText(BREEDING_SOW_STATUSES.vacia);

/**
 * Maps user input to the canonical pregnancy result values supported by the API.
 */
export const parsePregnancyResult = (value: string): PregnancyResult | null => {
  switch (normalizeText(value)) {
    case "pendiente":
      return PREGNANCY_RESULTS.pendiente;
    case "positivo":
      return PREGNANCY_RESULTS.positivo;
    case "negativo":
      return PREGNANCY_RESULTS.negativo;
    case "cancelado":
      return PREGNANCY_RESULTS.cancelado;
    case "cerrado":
      return PREGNANCY_RESULTS.cerrado;
    default:
      return null;
  }
};

/**
 * Defines which pregnancy-result transitions are allowed by the current business flow.
 */
export const isSupportedPregnancyResultTransition = (
  currentResult: PregnancyResult,
  nextResult: PregnancyResult,
) => {
  if (currentResult === nextResult) {
    return true;
  }

  if (currentResult === PREGNANCY_RESULTS.pendiente) {
    return nextResult === PREGNANCY_RESULTS.positivo || nextResult === PREGNANCY_RESULTS.negativo;
  }

  if (currentResult === PREGNANCY_RESULTS.positivo) {
    return nextResult === PREGNANCY_RESULTS.negativo;
  }

  return false;
};

/**
 * Returns the target sow status key for the supported transitions that actually move the sow.
 */
export const getSowStatusTransition = (
  currentResult: PregnancyResult,
  nextResult: PregnancyResult,
): SowStatusKey | null => {
  if (
    currentResult === PREGNANCY_RESULTS.pendiente &&
    nextResult === PREGNANCY_RESULTS.positivo
  ) {
    return "gestacion";
  }

  if (
    currentResult === PREGNANCY_RESULTS.positivo &&
    nextResult === PREGNANCY_RESULTS.negativo
  ) {
    return "vacia";
  }

  return null;
};

/**
 * Returns the sow status key that must be restored when deleting a mating event.
 * Only a positive pregnancy result reopens the sow for a new mating registration.
 */
export const getSowStatusAfterDeletingMatingEvent = (
  pregnancyResult: string | null,
): SowStatusKey | null => {
  if (!pregnancyResult) {
    return null;
  }

  const normalizedPregnancyResult = parsePregnancyResult(pregnancyResult);

  if (normalizedPregnancyResult === PREGNANCY_RESULTS.positivo) {
    return "vacia";
  }

  return null;
};

/**
 * Returns the sow status that should be set when a new mating event is created.
 * Only a positive pregnancy result places the sow into gestation immediately.
 */
export const getSowStatusForCreatedMatingEvent = (
  pregnancyResult: string | null,
): string | null => {
  if (!pregnancyResult) {
    return null;
  }

  const normalizedPregnancyResult = parsePregnancyResult(pregnancyResult);

  if (normalizedPregnancyResult === PREGNANCY_RESULTS.positivo) {
    return BREEDING_SOW_STATUSES.gestacion;
  }

  return null;
};
