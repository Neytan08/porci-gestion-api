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
  invalidCreatePayload: (issues: ZodIssue[]) =>
    createBreedError(
      400,
      BREED_ERROR_CODES.BREED_BODY_INVALID,
      "The request body contains invalid breed data.",
      "Cannot create breed",
      { issues },
    ),

  invalidUpdatePayload: (issues: ZodIssue[]) =>
    createBreedError(
      400,
      BREED_ERROR_CODES.BREED_UPDATE_BODY_INVALID,
      "The request body contains invalid fields for updating the breed.",
      "Cannot update breed",
      { issues },
    ),

  invalidBreedId: (rawValue: unknown, operation: "retrieve" | "update" | "delete") =>
    createBreedError(
      400,
      BREED_ERROR_CODES.BREED_ID_INVALID,
      "The breed id must be a positive integer.",
      `Cannot ${operation} breed`,
      { breedId: rawValue },
    ),

  breedNotFound: (breedId: number, operation: "retrieve" | "update" | "delete") =>
    createBreedError(
      404,
      BREED_ERROR_CODES.BREED_NOT_FOUND,
      "The breed was not found.",
      `Cannot ${operation} breed`,
      { breedId },
    ),

  breedNameAlreadyExists: (breedName: string) =>
    createBreedError(
      409,
      BREED_ERROR_CODES.BREED_NAME_ALREADY_EXISTS,
      "A breed with the same name already exists.",
      "Cannot save breed",
      { breedName },
    ),

  breedHasRelatedAnimals: (breedId: number, relatedBoarsCount: number, relatedSowsCount: number) =>
    createBreedError(
      409,
      BREED_ERROR_CODES.BREED_HAS_RELATED_ANIMALS,
      "The breed cannot be deleted because it has boars or breeding sows associated.",
      "Cannot delete breed",
      { breedId, relatedBoarsCount, relatedSowsCount },
    ),
};
