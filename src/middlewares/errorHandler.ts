import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/apiError';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import logger from '../utils/logger';

export function errorHandler(
    err: any, 
    req: Request, 
    res: Response, 
    next: NextFunction
) {
    //Log error
    logger.error(`${req.method} ${req.url} - ${err.message}`);
    
    // JSON parse error (invalid body)
    if (err instanceof SyntaxError && 'body' in err) {
        logger.debug('Invalid JSON body');
        return res.status(400).json({ message: 'Invalid JSON body' });
    }

    // Triggered errors by the routes
    if (err instanceof ApiError) {
        logger.debug(`ApiError: ${err.message}`);
        return res.status(err.statusCode).json({ message: err.message });
    }

    if (err instanceof PrismaClientKnownRequestError) {
        // Prisma codes errors
        logger.debug(`Prisma error: ${err.code}`);
        return res.status(400).json({ message: `Prisma error: ${err.code}` });
    }

    // Validations
    if (err?.name === 'ZodError') {
        logger.debug('Validation error');
        return res.status(400).json({ message: 'Validation error', issues: err.errors });
    }

    // Fallback (error did't find a specific handler)
    const status = err?.statusCode ?? 500;
    const response: any = {
        message: err?.message ?? 'Internal Server Error',
    };

    // Show dev stack trace
    if (process.env.NODE_ENV !== 'prod') {
        response.stack = err?.stack;
    }

    logger.error(`Unhandled error: ${err?.message ?? 'Internal Server Error'}`);
    return res.status(status).json(response);
}
