/**
 * Confirms that a parsed route value is a positive integer before a controller
 * delegates the request to the service layer.
 */
const isPositiveInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value > 0;

/**
 * Converts route params into numeric ids and raises the module-specific error
 * supplied by the controller when the value is not a valid id.
 */
export const parsePositiveIdOrThrow = (
  value: unknown,
  buildError: (rawValue: unknown) => Error,
) => {
  const parsedValue = Number(value);

  if (!isPositiveInteger(parsedValue)) {
    throw buildError(value);
  }

  return parsedValue;
};

/**
 * Normalizes a single body id or a body id list into the deduplicated batch
 * format expected by bulk service commands.
 */
export const parsePositiveIdsOrThrow = (
  value: unknown,
  buildError: (rawValue: unknown) => Error,
) => {
  const rawIds = Array.isArray(value) ? value : [value];

  if (rawIds.length === 0 || !rawIds.every(isPositiveInteger)) {
    throw buildError(value);
  }

  return Array.from(new Set(rawIds));
};

/**
 * Ensures string params that represent tag numbers, names, or statuses are not
 * empty after trimming whitespace.
 */
export const parseRequiredStringParamOrThrow = (
  value: unknown,
  buildError: (rawValue: unknown) => Error,
) => {
  if (typeof value !== "string") {
    throw buildError(value);
  }

  const parsedValue = value.trim();

  if (parsedValue.length === 0) {
    throw buildError(value);
  }

  return parsedValue;
};
