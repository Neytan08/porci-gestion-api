import type { ZodIssue } from "zod";
import ApiError, { type ApiErrorLogContext } from "../../utils/apiError";

export const FARROWING_ERROR_CODES = {
  FARROWING_BODY_INVALID: "FARROWING_BODY_INVALID",
  FARROWING_UPDATE_BODY_INVALID: "FARROWING_UPDATE_BODY_INVALID",
  FARROWING_ID_INVALID: "FARROWING_ID_INVALID",
  SOW_ID_INVALID: "SOW_ID_INVALID",
  FARROWING_NOT_FOUND: "FARROWING_NOT_FOUND",
  SOW_NOT_FOUND: "SOW_NOT_FOUND",
  SOW_NOT_GESTATING: "SOW_NOT_GESTATING",
  POSITIVE_MATING_EVENT_NOT_FOUND: "POSITIVE_MATING_EVENT_NOT_FOUND",
  FARROWING_SOW_STATUS_UPDATE_FAILED: "FARROWING_SOW_STATUS_UPDATE_FAILED",
} as const;

type FarrowingErrorCode = (typeof FARROWING_ERROR_CODES)[keyof typeof FARROWING_ERROR_CODES];

/**
 * Builds a standardized ApiError for farrowing workflows.
 *
 * @param statusCode HTTP status returned to the client.
 * @param errorCode Stable farrowing error code used by API consumers.
 * @param message Client-facing explanation of what went wrong.
 * @param logMessage Short server-facing summary for logs.
 * @param logContext Optional structured data that helps debug the failure.
 */
const createFarrowingError = (
  statusCode: number,
  errorCode: FarrowingErrorCode,
  message: string,
  logMessage: string,
  logContext?: ApiErrorLogContext,
) =>
  new ApiError(statusCode, message, {
    errorCode,
    logMessage,
    logContext,
  });

export const farrowingErrors = {
  /** The create payload failed the farrowing creation schema validation. */
  invalidCreatePayload: (issues: ZodIssue[]) =>
    createFarrowingError(
      400,
      FARROWING_ERROR_CODES.FARROWING_BODY_INVALID,
      "The request body contains invalid farrowing data.",
      "Cannot create farrowing",
      { issues },
    ),

  /** The update payload contains fields or values rejected by the farrowing update schema. */
  invalidUpdatePayload: (issues: ZodIssue[]) =>
    createFarrowingError(
      400,
      FARROWING_ERROR_CODES.FARROWING_UPDATE_BODY_INVALID,
      "The request body contains invalid fields for updating the farrowing.",
      "Cannot update farrowing",
      { issues },
    ),

  /** The farrowing route id is missing, non-numeric, or not a positive integer. */
  invalidFarrowingId: (rawValue: unknown, operation: "retrieve" | "update" | "delete") =>
    createFarrowingError(
      400,
      FARROWING_ERROR_CODES.FARROWING_ID_INVALID,
      "The farrowing id must be a positive integer.",
      `Cannot ${operation} farrowing`,
      { farrowingId: rawValue },
    ),

  /** The sow route id is missing, non-numeric, or not a positive integer. */
  invalidSowId: (rawValue: unknown) =>
    createFarrowingError(
      400,
      FARROWING_ERROR_CODES.SOW_ID_INVALID,
      "The sow id must be a positive integer.",
      "Cannot fetch farrowings by sow",
      { sowId: rawValue },
    ),

  /** The requested farrowing id does not match an existing farrowing record. */
  farrowingNotFound: (farrowingId: number, operation: "retrieve" | "update" | "delete") =>
    createFarrowingError(
      404,
      FARROWING_ERROR_CODES.FARROWING_NOT_FOUND,
      "The farrowing was not found.",
      `Cannot ${operation} farrowing`,
      { farrowingId },
    ),

  /** The sow selected for farrowing creation does not exist. */
  sowNotFound: (sowId: number) =>
    createFarrowingError(
      404,
      FARROWING_ERROR_CODES.SOW_NOT_FOUND,
      "The sow was not found.",
      "Cannot create farrowing",
      { sowId },
    ),

  /** The sow exists but is not in gestation, so a farrowing cannot be created for her. */
  sowNotGestating: (sowId: number, currentStatus: string | null | undefined) =>
    createFarrowingError(
      409,
      FARROWING_ERROR_CODES.SOW_NOT_GESTATING,
      "The sow must be in gestation status before creating a farrowing.",
      "Cannot create farrowing",
      { sowId, currentStatus },
    ),

  /** The sow has no positive mating event available to link with the new farrowing. */
  positiveMatingEventNotFound: (sowId: number) =>
    createFarrowingError(
      409,
      FARROWING_ERROR_CODES.POSITIVE_MATING_EVENT_NOT_FOUND,
      "The sow must have a positive mating event before creating a farrowing.",
      "Cannot create farrowing",
      { sowId },
    ),

  /** The creation transaction could not move the sow from gestation to lactation. */
  sowStatusUpdateFailed: (sowId: number) =>
    createFarrowingError(
      409,
      FARROWING_ERROR_CODES.FARROWING_SOW_STATUS_UPDATE_FAILED,
      "The sow could not be moved to lactation for this farrowing.",
      "Cannot complete farrowing creation",
      { sowId },
    ),
};
