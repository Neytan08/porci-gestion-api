import type { ZodIssue } from "zod";
import ApiError, { type ApiErrorLogContext } from "../../utils/apiError";

export const BOAR_ERROR_CODES = {
  BOAR_BODY_INVALID: "BOAR_BODY_INVALID",
  BOAR_UPDATE_BODY_INVALID: "BOAR_UPDATE_BODY_INVALID",
  BOAR_RETIRE_BODY_INVALID: "BOAR_RETIRE_BODY_INVALID",
  BOAR_ID_INVALID: "BOAR_ID_INVALID",
  BOAR_TAG_NUMBER_INVALID: "BOAR_TAG_NUMBER_INVALID",
  BOAR_TAG_NUMBER_ALREADY_EXISTS: "BOAR_TAG_NUMBER_ALREADY_EXISTS",
  BOAR_NOT_FOUND: "BOAR_NOT_FOUND",
  BOAR_BREED_NOT_FOUND: "BOAR_BREED_NOT_FOUND",
  BOAR_REMOVAL_DATE_BEFORE_BIRTH_DATE: "BOAR_REMOVAL_DATE_BEFORE_BIRTH_DATE",
  BOAR_HAS_MATING_EVENTS: "BOAR_HAS_MATING_EVENTS",
  BOAR_ALREADY_RETIRED: "BOAR_ALREADY_RETIRED",
} as const;

type BoarErrorCode = (typeof BOAR_ERROR_CODES)[keyof typeof BOAR_ERROR_CODES];

const createBoarError = (
  statusCode: number,
  errorCode: BoarErrorCode,
  message: string,
  logMessage: string,
  logContext?: ApiErrorLogContext,
) =>
  new ApiError(statusCode, message, {
    errorCode,
    logMessage,
    logContext,
  });

export const boarErrors = {
  invalidCreatePayload: (issues: ZodIssue[]) =>
    createBoarError(
      400,
      BOAR_ERROR_CODES.BOAR_BODY_INVALID,
      "The request body contains invalid boar data.",
      "Cannot create boar",
      { issues },
    ),

  invalidUpdatePayload: (issues: ZodIssue[]) =>
    createBoarError(
      400,
      BOAR_ERROR_CODES.BOAR_UPDATE_BODY_INVALID,
      "The request body contains invalid fields for updating the boar.",
      "Cannot update boar",
      { issues },
    ),

  invalidRetirePayload: (issues: ZodIssue[]) =>
    createBoarError(
      400,
      BOAR_ERROR_CODES.BOAR_RETIRE_BODY_INVALID,
      "The request body contains invalid fields for retiring the boar.",
      "Cannot retire boar",
      { issues },
    ),

  invalidBoarId: (
    rawValue: unknown,
    operation: "retrieve" | "update" | "delete" | "retire",
  ) =>
    createBoarError(
      400,
      BOAR_ERROR_CODES.BOAR_ID_INVALID,
      "The boar id must be a positive integer.",
      `Cannot ${operation} boar`,
      { boarId: rawValue },
    ),

  invalidBoarIds: (rawValue: unknown) =>
    createBoarError(
      400,
      BOAR_ERROR_CODES.BOAR_ID_INVALID,
      "The boar ids must be positive integers.",
      "Cannot retire boars",
      { boarIds: rawValue },
    ),

  invalidBoarTagNumber: (rawValue: unknown) =>
    createBoarError(
      400,
      BOAR_ERROR_CODES.BOAR_TAG_NUMBER_INVALID,
      "The boar tag number must be a non-empty string.",
      "Cannot check boar tag number",
      { boarTagNumber: rawValue },
    ),

  boarNotFound: (boarId: number, operation: "retrieve" | "update" | "delete" | "retire") =>
    createBoarError(
      404,
      BOAR_ERROR_CODES.BOAR_NOT_FOUND,
      "The boar was not found.",
      `Cannot ${operation} boar`,
      { boarId },
    ),

  boarsNotFound: (boarIds: number[], missingBoarIds: number[]) =>
    createBoarError(
      404,
      BOAR_ERROR_CODES.BOAR_NOT_FOUND,
      "One or more boars were not found.",
      "Cannot retire boars",
      { boarIds, missingBoarIds },
    ),

  alreadyRetired: (boarIds: number[]) =>
    createBoarError(
      409,
      BOAR_ERROR_CODES.BOAR_ALREADY_RETIRED,
      "Retired boars cannot be changed or retired again.",
      "Cannot change retired boars",
      { boarIds },
    ),

  breedNotFound: (breedId: number) =>
    createBoarError(
      404,
      BOAR_ERROR_CODES.BOAR_BREED_NOT_FOUND,
      "The selected breed was not found.",
      "Cannot save boar",
      { breedId },
    ),

  tagNumberAlreadyExists: (boarTagNumber: string) =>
    createBoarError(
      409,
      BOAR_ERROR_CODES.BOAR_TAG_NUMBER_ALREADY_EXISTS,
      "A boar with the same tag number already exists.",
      "Cannot save boar",
      { boarTagNumber },
    ),

  removalDateBeforeBirthDate: (birthDate: unknown, removalDate: unknown) =>
    createBoarError(
      400,
      BOAR_ERROR_CODES.BOAR_REMOVAL_DATE_BEFORE_BIRTH_DATE,
      "The removal date cannot be before the birth date.",
      "Cannot save boar",
      { birthDate, removalDate },
    ),

  boarHasMatingEvents: (boarId: number, matingEventsCount: number) =>
    createBoarError(
      409,
      BOAR_ERROR_CODES.BOAR_HAS_MATING_EVENTS,
      "The boar cannot be deleted because it has mating events associated.",
      "Cannot delete boar",
      { boarId, matingEventsCount },
    ),
};
