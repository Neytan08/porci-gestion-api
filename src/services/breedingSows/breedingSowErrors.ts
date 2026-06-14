import type { ZodIssue } from "zod";
import ApiError, { type ApiErrorLogContext } from "../../utils/apiError";

export const BREEDING_SOW_ERROR_CODES = {
  BREEDING_SOW_BODY_INVALID: "BREEDING_SOW_BODY_INVALID",
  BREEDING_SOW_UPDATE_BODY_INVALID: "BREEDING_SOW_UPDATE_BODY_INVALID",
  BREEDING_SOW_ID_INVALID: "BREEDING_SOW_ID_INVALID",
  BREEDING_SOW_TAG_NUMBER_INVALID: "BREEDING_SOW_TAG_NUMBER_INVALID",
  BREEDING_SOW_TAG_NUMBER_ALREADY_EXISTS: "BREEDING_SOW_TAG_NUMBER_ALREADY_EXISTS",
  BREEDING_SOW_NOT_FOUND: "BREEDING_SOW_NOT_FOUND",
  BREEDING_SOW_BREED_NOT_FOUND: "BREEDING_SOW_BREED_NOT_FOUND",
  BREEDING_SOW_STATUS_INVALID: "BREEDING_SOW_STATUS_INVALID",
  BREEDING_SOW_REMOVAL_DATE_BEFORE_ENTRY_DATE: "BREEDING_SOW_REMOVAL_DATE_BEFORE_ENTRY_DATE",
  BREEDING_SOW_LAST_WEANING_DATE_BEFORE_ENTRY_DATE:
    "BREEDING_SOW_LAST_WEANING_DATE_BEFORE_ENTRY_DATE",
  BREEDING_SOW_HAS_MATING_EVENTS: "BREEDING_SOW_HAS_MATING_EVENTS",
} as const;

type BreedingSowErrorCode =
  (typeof BREEDING_SOW_ERROR_CODES)[keyof typeof BREEDING_SOW_ERROR_CODES];

const createBreedingSowError = (
  statusCode: number,
  errorCode: BreedingSowErrorCode,
  message: string,
  logMessage: string,
  logContext?: ApiErrorLogContext,
) =>
  new ApiError(statusCode, message, {
    errorCode,
    logMessage,
    logContext,
  });

export const breedingSowErrors = {
  invalidCreatePayload: (issues: ZodIssue[]) =>
    createBreedingSowError(
      400,
      BREEDING_SOW_ERROR_CODES.BREEDING_SOW_BODY_INVALID,
      "The request body contains invalid breeding sow data.",
      "Cannot create breeding sow",
      { issues },
    ),

  invalidUpdatePayload: (issues: ZodIssue[]) =>
    createBreedingSowError(
      400,
      BREEDING_SOW_ERROR_CODES.BREEDING_SOW_UPDATE_BODY_INVALID,
      "The request body contains invalid fields for updating the breeding sow.",
      "Cannot update breeding sow",
      { issues },
    ),

  invalidBreedingSowId: (rawValue: unknown, operation: "retrieve" | "update" | "delete") =>
    createBreedingSowError(
      400,
      BREEDING_SOW_ERROR_CODES.BREEDING_SOW_ID_INVALID,
      "The breeding sow id must be a positive integer.",
      `Cannot ${operation} breeding sow`,
      { sowId: rawValue },
    ),

  invalidSowTagNumber: (rawValue: unknown) =>
    createBreedingSowError(
      400,
      BREEDING_SOW_ERROR_CODES.BREEDING_SOW_TAG_NUMBER_INVALID,
      "The breeding sow tag number must be a non-empty string.",
      "Cannot check breeding sow tag number",
      { sowTagNumber: rawValue },
    ),

  invalidStatus: (status: unknown) =>
    createBreedingSowError(
      400,
      BREEDING_SOW_ERROR_CODES.BREEDING_SOW_STATUS_INVALID,
      "The breeding sow status must be Gestacion, Lactancia, Vacia or No Productiva.",
      "Cannot fetch breeding sows by status",
      { status },
    ),

  breedingSowNotFound: (sowId: number, operation: "retrieve" | "update" | "delete") =>
    createBreedingSowError(
      404,
      BREEDING_SOW_ERROR_CODES.BREEDING_SOW_NOT_FOUND,
      "The breeding sow was not found.",
      `Cannot ${operation} breeding sow`,
      { sowId },
    ),

  breedNotFound: (breedId: number) =>
    createBreedingSowError(
      404,
      BREEDING_SOW_ERROR_CODES.BREEDING_SOW_BREED_NOT_FOUND,
      "The selected breed was not found.",
      "Cannot save breeding sow",
      { breedId },
    ),

  tagNumberAlreadyExists: (sowTagNumber: string) =>
    createBreedingSowError(
      409,
      BREEDING_SOW_ERROR_CODES.BREEDING_SOW_TAG_NUMBER_ALREADY_EXISTS,
      "A breeding sow with the same tag number already exists.",
      "Cannot save breeding sow",
      { sowTagNumber },
    ),

  removalDateBeforeEntryDate: (entryDate: unknown, removalDate: unknown) =>
    createBreedingSowError(
      400,
      BREEDING_SOW_ERROR_CODES.BREEDING_SOW_REMOVAL_DATE_BEFORE_ENTRY_DATE,
      "The removal date cannot be before the entry date.",
      "Cannot save breeding sow",
      { entryDate, removalDate },
    ),

  lastWeaningDateBeforeEntryDate: (entryDate: unknown, lastWeaningDate: unknown) =>
    createBreedingSowError(
      400,
      BREEDING_SOW_ERROR_CODES.BREEDING_SOW_LAST_WEANING_DATE_BEFORE_ENTRY_DATE,
      "The last weaning date cannot be before the entry date.",
      "Cannot save breeding sow",
      { entryDate, lastWeaningDate },
    ),

  breedingSowHasMatingEvents: (sowId: number, matingEventsCount: number) =>
    createBreedingSowError(
      409,
      BREEDING_SOW_ERROR_CODES.BREEDING_SOW_HAS_MATING_EVENTS,
      "The breeding sow cannot be deleted because it has mating events associated.",
      "Cannot delete breeding sow",
      { sowId, matingEventsCount },
    ),
};
