import type { ZodIssue } from "zod";
import ApiError, { type ApiErrorLogContext } from "../../utils/apiError";

export const MATING_EVENT_ERROR_CODES = {
  MATING_EVENT_BODY_INVALID: "MATING_EVENT_BODY_INVALID",
  MATING_EVENT_PREGNANCY_UPDATE_BODY_INVALID: "MATING_EVENT_PREGNANCY_UPDATE_BODY_INVALID",
  MATING_EVENT_ID_INVALID: "MATING_EVENT_ID_INVALID",
  SOW_ID_INVALID: "SOW_ID_INVALID",
  BOAR_ID_INVALID: "BOAR_ID_INVALID",
  BOAR_RETIRED: "BOAR_RETIRED",
  BOAR_NOT_FOUND: "BOAR_NOT_FOUND",
  MATING_EVENT_NOT_FOUND: "MATING_EVENT_NOT_FOUND",
  SOW_NOT_FOUND: "SOW_NOT_FOUND",
  SOW_NOT_EMPTY: "SOW_NOT_EMPTY",
  SOW_HAS_ACTIVE_MATING_EVENT: "SOW_HAS_ACTIVE_MATING_EVENT",
  MATING_IDS_INVALID: "MATING_IDS_INVALID",
  MATING_EVENTS_NOT_FOUND: "MATING_EVENTS_NOT_FOUND",
  MATING_EVENT_PREGNANCY_RESULT_MISSING: "MATING_EVENT_PREGNANCY_RESULT_MISSING",
  MATING_EVENT_PREGNANCY_RESULT_UNSUPPORTED: "MATING_EVENT_PREGNANCY_RESULT_UNSUPPORTED",
  MIXED_CURRENT_PREGNANCY_RESULTS: "MIXED_CURRENT_PREGNANCY_RESULTS",
  PREGNANCY_RESULT_INVALID: "PREGNANCY_RESULT_INVALID",
  PREGNANCY_RESULT_TRANSITION_NOT_ALLOWED: "PREGNANCY_RESULT_TRANSITION_NOT_ALLOWED",
  MATING_EVENT_HAS_FARROWINGS: "MATING_EVENT_HAS_FARROWINGS",
  MATING_EVENT_TRANSACTION_STATE_CHANGED: "MATING_EVENT_TRANSACTION_STATE_CHANGED",
} as const;

type MatingEventErrorCode =
  (typeof MATING_EVENT_ERROR_CODES)[keyof typeof MATING_EVENT_ERROR_CODES];

const createMatingEventError = (
  statusCode: number,
  errorCode: MatingEventErrorCode,
  message: string,
  logMessage: string,
  logContext?: ApiErrorLogContext,
) =>
  new ApiError(statusCode, message, {
    errorCode,
    logMessage,
    logContext,
  });

export const matingEventErrors = {
  invalidCreatePayload: (issues: ZodIssue[]) =>
    createMatingEventError(
      400,
      MATING_EVENT_ERROR_CODES.MATING_EVENT_BODY_INVALID,
      "The request body contains invalid mating event data.",
      "Cannot create mating event",
      { issues },
    ),

  invalidPregnancyUpdatePayload: (issues: ZodIssue[]) =>
    createMatingEventError(
      400,
      MATING_EVENT_ERROR_CODES.MATING_EVENT_PREGNANCY_UPDATE_BODY_INVALID,
      "The request body contains invalid pregnancy-result update data.",
      "Cannot update mating event pregnancy result",
      { issues },
    ),

  invalidMatingEventId: (
    rawValue: unknown,
    operation: "retrieve" | "delete",
  ) =>
    createMatingEventError(
      400,
      MATING_EVENT_ERROR_CODES.MATING_EVENT_ID_INVALID,
      "The mating event id must be a positive integer.",
      `Cannot ${operation} mating event`,
      { matingEventId: rawValue },
    ),

  invalidSowId: (rawValue: unknown) =>
    createMatingEventError(
      400,
      MATING_EVENT_ERROR_CODES.SOW_ID_INVALID,
      "The sow id must be a positive integer.",
      "Cannot fetch mating events by sow",
      { sowId: rawValue },
    ),

  invalidBoarId: (rawValue: unknown) =>
    createMatingEventError(
      400,
      MATING_EVENT_ERROR_CODES.BOAR_ID_INVALID,
      "The boar id must be a positive integer.",
      "Cannot fetch mating events by boar",
      { boarId: rawValue },
    ),

  boarRetired: (boarId: number) =>
    createMatingEventError(
      409,
      MATING_EVENT_ERROR_CODES.BOAR_RETIRED,
      "A retired boar cannot be assigned to a mating event.",
      "Cannot assign retired boar to mating event",
      { boarId },
    ),

  boarNotFound: (boarId: number) =>
    createMatingEventError(
      404,
      MATING_EVENT_ERROR_CODES.BOAR_NOT_FOUND,
      "The selected boar was not found.",
      "Cannot assign boar to mating event",
      { boarId },
    ),

  matingEventNotFound: (
    matingEventId: number,
    operation: "retrieve" | "delete",
  ) =>
    createMatingEventError(
      404,
      MATING_EVENT_ERROR_CODES.MATING_EVENT_NOT_FOUND,
      "The mating event was not found.",
      `Cannot ${operation} mating event`,
      { matingEventId },
    ),

  sowNotFound: (sowId: number) =>
    createMatingEventError(
      404,
      MATING_EVENT_ERROR_CODES.SOW_NOT_FOUND,
      "The sow was not found.",
      "Cannot create mating event",
      { sowId },
    ),

  sowNotEmpty: (sowId: number, currentStatus: string | null | undefined) =>
    createMatingEventError(
      409,
      MATING_EVENT_ERROR_CODES.SOW_NOT_EMPTY,
      "The sow must be in empty status before creating a mating event.",
      "Cannot create mating event",
      { sowId, currentStatus },
    ),

  sowHasActiveMatingEvent: (
    sowId: number,
    blockingMatingEventId: number,
    currentPregnancyResult: string | null,
  ) =>
    createMatingEventError(
      409,
      MATING_EVENT_ERROR_CODES.SOW_HAS_ACTIVE_MATING_EVENT,
      "The sow already has an active mating event in progress.",
      "Cannot create mating event",
      { sowId, blockingMatingEventId, currentPregnancyResult },
    ),

  invalidMatingIds: (matingIds: unknown) =>
    createMatingEventError(
      400,
      MATING_EVENT_ERROR_CODES.MATING_IDS_INVALID,
      "The mating_ids field must contain one or more positive integers.",
      "Cannot update pregnancy result",
      { matingIds },
    ),

  invalidPregnancyResult: (
    pregnancyResult: unknown,
    operation: "create" | "update" = "update",
  ) =>
    createMatingEventError(
      400,
      MATING_EVENT_ERROR_CODES.PREGNANCY_RESULT_INVALID,
      "The pregnancy_result must be 'Pendiente', 'Positivo' or 'Negativo'.",
      `Cannot ${operation} mating event pregnancy result`,
      { pregnancyResult },
    ),

  matingEventsNotFound: (requestedMatingIds: number[], missingMatingIds: number[]) =>
    createMatingEventError(
      404,
      MATING_EVENT_ERROR_CODES.MATING_EVENTS_NOT_FOUND,
      "One or more mating events were not found.",
      "Cannot update pregnancy result",
      { requestedMatingIds, missingMatingIds },
    ),

  noMatingEventsToUpdate: () =>
    createMatingEventError(
      404,
      MATING_EVENT_ERROR_CODES.MATING_EVENTS_NOT_FOUND,
      "No mating events were found to update.",
      "Cannot update pregnancy result",
    ),

  pregnancyResultMissing: (matingEventId: number) =>
    createMatingEventError(
      409,
      MATING_EVENT_ERROR_CODES.MATING_EVENT_PREGNANCY_RESULT_MISSING,
      "The mating event does not have a pregnancy result assigned.",
      "Cannot update pregnancy result",
      { matingEventId },
    ),

  unsupportedStoredPregnancyResult: (
    matingEventId: number,
    currentPregnancyResult: string | null,
  ) =>
    createMatingEventError(
      409,
      MATING_EVENT_ERROR_CODES.MATING_EVENT_PREGNANCY_RESULT_UNSUPPORTED,
      "The mating event has an unsupported pregnancy result.",
      "Cannot update pregnancy result",
      { matingEventId, currentPregnancyResult },
    ),

  mixedCurrentPregnancyResults: (
    requestedMatingIds: number[],
    currentPregnancyResults: string[],
  ) =>
    createMatingEventError(
      409,
      MATING_EVENT_ERROR_CODES.MIXED_CURRENT_PREGNANCY_RESULTS,
      "All mating events in the same update must share the same current pregnancy result.",
      "Cannot update pregnancy result",
      { requestedMatingIds, currentPregnancyResults },
    ),

  pregnancyResultTransitionNotAllowed: (
    currentPregnancyResult: string,
    nextPregnancyResult: string,
    requestedMatingIds: number[],
  ) =>
    createMatingEventError(
      409,
      MATING_EVENT_ERROR_CODES.PREGNANCY_RESULT_TRANSITION_NOT_ALLOWED,
      "The requested pregnancy result transition is not allowed.",
      "Cannot update pregnancy result",
      { currentPregnancyResult, nextPregnancyResult, requestedMatingIds },
    ),

  matingEventHasFarrowings: (matingEventId: number, farrowingCount?: number) =>
    createMatingEventError(
      409,
      MATING_EVENT_ERROR_CODES.MATING_EVENT_HAS_FARROWINGS,
      "The mating event cannot be deleted because it is referenced by farrowing history.",
      "Cannot delete mating event with related farrowings",
      { matingEventId, farrowingCount },
    ),

  transactionStateChanged: (
    matingEventIds: number[],
    reason: string,
    expectedCount?: number,
    actualCount?: number,
  ) =>
    createMatingEventError(
      409,
      MATING_EVENT_ERROR_CODES.MATING_EVENT_TRANSACTION_STATE_CHANGED,
      "The reproductive state changed during the operation. Retry with the current data.",
      "Cannot complete mating event transaction because reproductive state changed",
      { matingEventIds, reason, expectedCount, actualCount },
    ),
};
