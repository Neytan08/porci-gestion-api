export const PREGNANCY_RESULTS = {
  pendiente: "Pendiente",
  positivo: "Positivo",
  negativo: "Negativo",
} as const;

export const SOW_STATUS_LABELS = {
  vacia: "Vacia",
  gestacion: "Gestacion",
  lactancia: "Lactancia",
  noProductiva: "No Productiva",
} as const;

export type PregnancyResult = (typeof PREGNANCY_RESULTS)[keyof typeof PREGNANCY_RESULTS];
export type SowStatusKey = keyof typeof SOW_STATUS_LABELS;

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
export const isEmptySowStatus = (statusName: string) => normalizeText(statusName) === normalizeText(SOW_STATUS_LABELS.vacia);

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