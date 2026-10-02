import fs from "node:fs";
import path from "node:path";
import { config } from "../config";
import { createOpenApiSpecification } from "../openapi";

/** Writes the OpenAPI contract beside compiled application files for production startup. */
const generateOpenApiArtifact = () => {
  const outputPath = path.resolve(__dirname, "../openapi.json");
  const specification = createOpenApiSpecification(config.apiBaseUrl);
  fs.writeFileSync(outputPath, `${JSON.stringify(specification, null, 2)}\n`, "utf8");
};

generateOpenApiArtifact();
