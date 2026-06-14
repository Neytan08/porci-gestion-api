export type ApiErrorLogContext = Record<string, unknown>;

type ApiErrorOptions = {
  errorCode?: string;
  isOperational?: boolean;
  logContext?: ApiErrorLogContext;
  logMessage?: string;
};

const DEFAULT_ERROR_CODES: Record<number, string> = {
  400: "BAD_REQUEST",
  404: "NOT_FOUND",
  409: "CONFLICT",
  500: "INTERNAL_SERVER_ERROR",
};

export class ApiError extends Error {
  public statusCode: number;
  public errorCode: string;
  public isOperational: boolean = true;
  public logContext?: ApiErrorLogContext;
  public logMessage: string;

  constructor(statusCode: number, message: string, options: ApiErrorOptions = {}) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype); // restore prototype chain
    this.statusCode = statusCode;
    this.errorCode = options.errorCode ?? DEFAULT_ERROR_CODES[statusCode] ?? "INTERNAL_SERVER_ERROR";
    this.isOperational = options.isOperational ?? true;
    this.logContext = options.logContext;
    this.logMessage = options.logMessage ?? message;
    Error.captureStackTrace(this);
  }

  static notFound(msg: string, options: ApiErrorOptions = {}) {
    return new ApiError(404, msg, options);
  }

  static badRequest(msg: string, options: ApiErrorOptions = {}) {
    return new ApiError(400, msg, options);
  }

  static conflict(msg: string, options: ApiErrorOptions = {}) {
    return new ApiError(409, msg, options);
  }

  static internal(msg: string, options: ApiErrorOptions = {}) {
    return new ApiError(500, msg, options);
  }
}

export default ApiError;
