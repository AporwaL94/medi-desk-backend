import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

export function globalErrorHandler(
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  console.error(`[Error] ${req.method} ${req.path} - StatusCode: ${statusCode}`, err);

  res.status(statusCode).json({
    success: false,
    message,
    ...(env.nodeEnv === 'development' && {
      stack: err.stack,
      details: err
    })
  });
}
