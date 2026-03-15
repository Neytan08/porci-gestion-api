import { createLogger, format, transports } from "winston";

const { combine, timestamp, printf, colorize } = format;

// Personalized log format
const logFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level}]: ${message}`;
});

// Logger configuration
const logger = createLogger({
  level: process.env.NODE_ENV === "prod" ? "info" : "debug",
  format: combine(
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
