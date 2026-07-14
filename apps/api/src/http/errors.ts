import type { ErrorRequestHandler, NextFunction, Request, Response } from "express";
import type { Logger } from "pino";

export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function badRequest(message: string): HttpError {
  return new HttpError(400, message);
}

export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    handler(req, res, next).catch(next);
  };
}

export function createErrorHandler(logger: Logger): ErrorRequestHandler {
  return (error: Error, _req: Request, res: Response, _next: NextFunction): void => {
    void _next;

    if (error instanceof HttpError) {
      res.status(error.statusCode).json({
        status: "error",
        message: error.message,
      });
      return;
    }

    logger.error({ err: error }, "Unhandled API error");
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  };
}
