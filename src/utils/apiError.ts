export class ApiError extends Error {
  public statusCode: number;
  public isOperational: boolean = true;

  constructor(statusCode : number, message : string, isOperational = true) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype); // restore prototype chain
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this);
  }

  static notFound(msg: string) {
    return new ApiError(404, msg);
  }

  static badRequest(msg: string) {
    return new ApiError(400, msg);
  }

  static internal(msg: string) {
    return new ApiError(500, msg);
  }
}

export default ApiError;