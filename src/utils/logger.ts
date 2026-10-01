import { createLogger, format, transports } from "winston";
import { getRequestContext } from "../middlewares/requestContext";

const { combine, timestamp, printf, colorize, errors, json } = format;

const RESERVED_LOG_KEYS = new Set(["level", "message", "timestamp", "stack"]);

const formatMetadataValue = (value: unknown) => {
  if (typeof value === "string") {
    return value;
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null ||
    value === undefined
  ) {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

// Serializes metadata fields into a single string for console output.
const serializeMetadata = (info: Record<string, unknown>) => {
  const metadataEntries = Object.entries(info).filter(
    ([key, value]) => !RESERVED_LOG_KEYS.has(key) && value !== undefined,
  );

  if (metadataEntries.length === 0) {
    return "";
  }

  const metadata = metadataEntries
    .map(([key, value]) => `${key}=${formatMetadataValue(value)}`)
    .join(" ");

  return ` { ${metadata} }`;
};

// Personalized log format
const logFormat = printf((info) => {
  const metadata = serializeMetadata(info as Record<string, unknown>);
  const stack = typeof info.stack === "string" ? `\n${info.stack}` : "";

  return `${info.timestamp} [${info.level}]: ${info.message}${metadata}${stack}`;
});

// Enriches every record created during a request without coupling callers to Express.
const requestContextFormat = format((info) => {
  const requestContext = getRequestContext();

  if (!requestContext) {
    return info;
  }

  info.requestId = requestContext.requestId;
  info.method = requestContext.method;
  info.path = requestContext.path;
  return info;
});

// Logger configuration
const logger = createLogger({
  level:
    process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug"),
  format: combine(
    errors({ stack: true }),
    requestContextFormat(),
    timestamp(),
  ),
  transports: [
    new transports.Console({ format: combine(colorize(), logFormat) }),
    new transports.File({ filename: "logs/error.log", level: "error", format: json() }),
    new transports.File({ filename: "logs/combined.log", format: json() }),
  ],
  exitOnError: false,
});

export default logger;
