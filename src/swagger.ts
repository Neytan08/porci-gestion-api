import type { Express } from "express";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "PorciGestion API",
      version: "1.0.0",
      description:
        "API for managing swine farm operations. " +
        "Every response includes an X-Request-ID header for request correlation.",
    },
    servers: [{ url: "http://localhost:3000/api", description: "Local Server" }],
    components: {
      headers: {
        RequestId: {
          description: "Unique identifier used to correlate logs for this request.",
          schema: { type: "string" },
        },
      },
    },
  },
  apis: ["./src/routes/*.ts", "./src/controllers/*.ts"],
};

const specs = swaggerJsdoc(options);

export function setupSwagger(app: Express) {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));
}
