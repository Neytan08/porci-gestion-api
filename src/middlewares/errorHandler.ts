import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/apiError';
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
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
        logger.debug(`ApiError code: ${err.statusCode}, ${err.message}`);
        return res.status(err.statusCode).json({ message: err.message });
    }

    // Prisma Client Known Errors
    if (err?.name === "PrismaClientKnownRequestError") {
        const prismaError = err as PrismaClientKnownRequestError;
        logger.debug(`Prisma error caught: ${prismaError.code}`);

        if (prismaError.code === "P2002") {
            return res.status(409).json({ message: "Unique constraint failed" });
        }

        if (prismaError.code === "P2025") {
            return res.status(404).json({ message: "Record not found" });
        }
        return res.status(400).json({ message: `Prisma error: ${prismaError.code}` });
    }

    // Validations
    if (err?.name === 'ZodError') {
        logger.debug('Validation zod error');
        return res.status(400).json({ message: 'Validation zod error', issues: err.errors });
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
