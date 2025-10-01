import { RequestHandler } from 'express';

/**
 * A utility to wrap async route handlers and middleware.
 * It catches any errors and passes them to the next middleware.
 */

export const asyncHandler = (fn: RequestHandler): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};