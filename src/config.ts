const DEFAULT_PORT = 3000;
const DEFAULT_SHUTDOWN_TIMEOUT_MS = 10_000;
const DEFAULT_LOG_FILE_MAX_BYTES = 10_000_000;
const DEFAULT_LOG_FILE_MAX_FILES = 5;

/** Reads a bounded integer environment setting or returns its documented default. */
const parseIntegerSetting = (
  name: string,
  defaultValue: number,
  minimum: number,
  maximum: number,
) => {
  const rawValue = process.env[name];
  if (rawValue === undefined) return defaultValue;

  const parsedValue = Number(rawValue);
  if (!Number.isInteger(parsedValue) || parsedValue < minimum || parsedValue > maximum) {
    throw new Error(`${name} must be an integer between ${minimum} and ${maximum}.`);
  }

  return parsedValue;
};

/** Normalizes an HTTP mount path so configuration and Express use the same value. */
const parseHttpPath = (name: string, defaultValue: string) => {
  const rawValue = process.env[name]?.trim() || defaultValue;
  const withLeadingSlash = rawValue.startsWith("/") ? rawValue : `/${rawValue}`;
  return withLeadingSlash.length > 1 ? withLeadingSlash.replace(/\/+$/, "") : withLeadingSlash;
};

/** Reads an explicit boolean environment setting without treating arbitrary text as true. */
const parseBooleanSetting = (name: string, defaultValue: boolean) => {
  const rawValue = process.env[name];
  if (rawValue === undefined) return defaultValue;
  if (rawValue === "true") return true;
  if (rawValue === "false") return false;
  throw new Error(`${name} must be either true or false.`);
};

/** Validates a public HTTP URL and removes a trailing slash before OpenAPI uses it. */
const parseHttpUrlSetting = (name: string, defaultValue: string) => {
  const rawValue = process.env[name]?.trim() || defaultValue;

  try {
    const parsedUrl = new URL(rawValue);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      throw new Error("unsupported protocol");
    }
    return parsedUrl.toString().replace(/\/$/, "");
  } catch {
    throw new Error(`${name} must be an absolute HTTP or HTTPS URL.`);
  }
};

const nodeEnv = process.env.NODE_ENV ?? "development";
const port = parseIntegerSetting("PORT", DEFAULT_PORT, 1, 65_535);
const swaggerPath = parseHttpPath("SWAGGER_PATH", "/api-docs");

/** Validated process configuration shared by startup and infrastructure modules. */
export const config = Object.freeze({
  nodeEnv,
  isProduction: nodeEnv === "production",
  port,
  apiBaseUrl: parseHttpUrlSetting("API_BASE_URL", `http://localhost:${port}/api`),
  swaggerPath,
  shutdownTimeoutMs: parseIntegerSetting(
    "SHUTDOWN_TIMEOUT_MS",
    DEFAULT_SHUTDOWN_TIMEOUT_MS,
    1_000,
    120_000,
  ),
  logLevel: process.env.LOG_LEVEL ?? (nodeEnv === "production" ? "info" : "debug"),
  logFormat: process.env.LOG_FORMAT ?? (nodeEnv === "production" ? "json" : "pretty"),
  logFilesEnabled: parseBooleanSetting("LOG_FILES_ENABLED", true),
  logFileMaxBytes: parseIntegerSetting(
    "LOG_FILE_MAX_BYTES",
    DEFAULT_LOG_FILE_MAX_BYTES,
    100_000,
    1_000_000_000,
  ),
  logFileMaxFiles: parseIntegerSetting("LOG_FILE_MAX_FILES", DEFAULT_LOG_FILE_MAX_FILES, 1, 100),
});

if (config.logFormat !== "pretty" && config.logFormat !== "json") {
  throw new Error("LOG_FORMAT must be either pretty or json.");
}
