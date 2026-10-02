import path from "node:path";
import swaggerJsdoc, { type Options } from "swagger-jsdoc";

const HTTP_METHODS = new Set(["get", "post", "put", "patch", "delete", "options", "head"]);

type OpenApiOperation = {
  responses?: Record<string, unknown>;
};

type OpenApiDocument = {
  openapi: string;
  info: Record<string, unknown>;
  servers?: Array<{ url: string; description?: string }>;
  paths?: Record<string, Record<string, OpenApiOperation>>;
  components?: Record<string, unknown>;
};

/** Marks documented integer values with the signed 32-bit range used by Prisma Int fields. */
const applyPostgresqlIntegerFormats = (value: unknown): void => {
  if (Array.isArray(value)) {
    for (const item of value) applyPostgresqlIntegerFormats(item);
    return;
  }

  if (value === null || typeof value !== "object") return;

  const objectValue = value as Record<string, unknown>;
  if (objectValue.type === "integer" && objectValue.format === undefined) {
    objectValue.format = "int32";
  }

  for (const childValue of Object.values(objectValue)) {
    applyPostgresqlIntegerFormats(childValue);
  }
};

/** Adds consistent operational failures without duplicating them across route annotations. */
const addOperationalResponses = (document: OpenApiDocument) => {
  for (const [routePath, pathItem] of Object.entries(document.paths ?? {})) {
    if (routePath.startsWith("/health/")) continue;

    for (const [method, operation] of Object.entries(pathItem)) {
      if (!HTTP_METHODS.has(method) || typeof operation !== "object") continue;
      operation.responses ??= {};
      operation.responses["500"] ??= {
        $ref: "#/components/responses/InternalServerError",
      };
      operation.responses["503"] ??= {
        $ref: "#/components/responses/DatabaseUnavailable",
      };
    }
  }

  return document;
};

/** Builds the complete API contract from route annotations for development and build output. */
export const createOpenApiSpecification = (apiBaseUrl: string) => {
  const options: Options = {
    definition: {
      openapi: "3.0.0",
      info: {
        title: "PorciGestion API",
        version: "1.0.0",
        description:
          "API for managing swine farm operations. " +
          "Every response includes an X-Request-ID header for request correlation.",
      },
      servers: [{ url: apiBaseUrl, description: "Configured API server" }],
      components: {
        headers: {
          RequestId: {
            description: "Unique identifier used to correlate logs for this request.",
            schema: { type: "string" },
          },
        },
        schemas: {
          ApiErrorResponse: {
            type: "object",
            properties: {
              status: { type: "integer", example: 409 },
              errorCode: { type: "string", example: "TRANSACTION_CONFLICT" },
              message: { type: "string", example: "The request could not be completed." },
            },
          },
        },
        responses: {
          InternalServerError: {
            description: "An unexpected server or persistence error occurred",
          },
          DatabaseUnavailable: {
            description: "The database is temporarily unavailable",
          },
        },
      },
    },
    apis: [
      path.resolve(process.cwd(), "src/routes/*.ts"),
      path.resolve(process.cwd(), "src/controllers/*.ts"),
    ],
  };

  const specification = swaggerJsdoc(options) as OpenApiDocument;
  applyPostgresqlIntegerFormats(specification);
  return addOperationalResponses(specification);
};
