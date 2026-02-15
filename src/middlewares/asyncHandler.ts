import { RequestHandler } from 'express';

/**
 * A utility to wrap async route handlers and middleware.
 * It catches any errors inside controller functions due to route handling 
 * and passes them to the next middleware.
 */

export const asyncHandler = (fn: RequestHandler): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(err => {
        next(err); // Pass the error to the next middleware (error handler)
    });
  };
};