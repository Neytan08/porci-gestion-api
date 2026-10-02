import type { ZodIssue } from "zod";
import ApiError, { type ApiErrorLogContext } from "../../utils/apiError";

export const BREED_ERROR_CODES = {
  BREED_BODY_INVALID: "BREED_BODY_INVALID",
  BREED_UPDATE_BODY_INVALID: "BREED_UPDATE_BODY_INVALID",
  BREED_ID_INVALID: "BREED_ID_INVALID",
  BREED_NAME_ALREADY_EXISTS: "BREED_NAME_ALREADY_EXISTS",
  BREED_NOT_FOUND: "BREED_NOT_FOUND",
  BREED_HAS_RELATED_ANIMALS: "BREED_HAS_RELATED_ANIMALS",
} as const;

type BreedErrorCode = (typeof BREED_ERROR_CODES)[keyof typeof BREED_ERROR_CODES];

/** Builds a breed failure with a stable HTTP code and structured logging context. */
const createBreedError = (
  statusCode: number,
  errorCode: BreedErrorCode,
  message: string,
  logMessage: string,
  logContext?: ApiErrorLogContext,
) =>
  new ApiError(statusCode, message, {
    errorCode,
    logMessage,
    logContext,
  });

export const breedErrors = {
  /** Reports structural validation failures in a create request. */
  invalidCreatePayload: (issues: ZodIssue[]) =>
    createBreedError(
      400,
      BREED_ERROR_CODES.BREED_BODY_INVALID,
      "The request body contains invalid breed data.",
      "Cannot create breed",
      { issues },
    ),

  /** Reports structural validation failures in a partial update request. */
  invalidUpdatePayload: (issues: ZodIssue[]) =>
    createBreedError(
      400,
      BREED_ERROR_CODES.BREED_UPDATE_BODY_INVALID,
      "The request body contains invalid fields for updating the breed.",
      "Cannot update breed",
      { issues },
    ),

  /** Identifies an invalid route ID while preserving the attempted operation. */
  invalidBreedId: (rawValue: unknown, operation: "retrieve" | "update" | "delete") =>
    createBreedError(
      400,
      BREED_ERROR_CODES.BREED_ID_INVALID,
      "The breed id must be a positive integer.",
      `Cannot ${operation} breed`,
      { breedId: rawValue },
    ),

  /** Reports that the breed required by an operation does not exist. */
  breedNotFound: (breedId: number, operation: "retrieve" | "update" | "delete") =>
    createBreedError(
      404,
      BREED_ERROR_CODES.BREED_NOT_FOUND,
      "The breed was not found.",
      `Cannot ${operation} breed`,
      { breedId },
    ),

  /** Reports a name that conflicts with an existing breed. */
  breedNameAlreadyExists: (breedName: string) =>
    createBreedError(
      409,
      BREED_ERROR_CODES.BREED_NAME_ALREADY_EXISTS,
      "A breed with the same name already exists.",
      "Cannot save breed",
      { breedName },
    ),

  /** Reports a blocked deletion, including relationship counts only when measured. */
  breedHasRelatedAnimals: (
    breedId: number,
    relatedBoarsCount?: number,
    relatedSowsCount?: number,
  ) =>
    createBreedError(
      409,
      BREED_ERROR_CODES.BREED_HAS_RELATED_ANIMALS,
      "The breed cannot be deleted because it has boars or breeding sows associated.",
      "Cannot delete breed",
      {
        breedId,
        ...(relatedBoarsCount === undefined ? {} : { relatedBoarsCount }),
        ...(relatedSowsCount === undefined ? {} : { relatedSowsCount }),
      },
    ),
};
