import { createLogger, format, transports } from "winston";

const { combine, timestamp, printf, colorize, errors } = format;

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

  return JSON.stringify(value);
};

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

// Logger configuration
const logger = createLogger({
  level: process.env.NODE_ENV === "prod" ? "info" : "debug",
  format: combine(
    errors({ stack: true }),
    colorize(), // conlose color
    timestamp(), // add timestamp
    logFormat,
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: "logs/error.log", level: "error" }), // errors to file
    new transports.File({ filename: "logs/combined.log" }), // all logs to file
  ],
  exitOnError: false,
});

export default logger;
