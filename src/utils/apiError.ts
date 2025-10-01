export class ApiError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(statusCode = 500, message = 'Internal Server Error', isOperational = true) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype); // restore prototype chain
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this);
  }
}
