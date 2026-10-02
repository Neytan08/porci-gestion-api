import fs from "node:fs";
import path from "node:path";
import type { Express } from "express";
import swaggerUi from "swagger-ui-express";
import { config } from "./config";
import { createOpenApiSpecification } from "./openapi";

/** Loads the generated production contract or builds it from source during development. */
const loadOpenApiSpecification = (apiBaseUrl: string) => {
  const generatedSpecificationPath = path.join(__dirname, "openapi.json");

  if (!fs.existsSync(generatedSpecificationPath)) {
    if (config.isProduction) {
      throw new Error(`OpenAPI artifact was not found at ${generatedSpecificationPath}.`);
    }

    return createOpenApiSpecification(apiBaseUrl);
  }

  const specification = JSON.parse(fs.readFileSync(generatedSpecificationPath, "utf8"));
  specification.servers = [{ url: apiBaseUrl, description: "Configured API server" }];
  return specification;
};

/** Mounts Swagger UI from the same path advertised by process configuration. */
export function setupSwagger(app: Express, swaggerPath: string, apiBaseUrl: string) {
  const specification = loadOpenApiSpecification(apiBaseUrl);
  app.use(swaggerPath, swaggerUi.serve, swaggerUi.setup(specification));
}
