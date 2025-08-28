import { Request, Response, NextFunction } from 'express';

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const start = Date.now();

  // Log request details
  console.log(
    `${new Date().toISOString()} - ${req.method} ${req.url} - IP: ${req.ip}`
  );

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const statusColor =
      status >= 400 ? '\x1b[31m' : status >= 300 ? '\x1b[33m' : '\x1b[32m';

    console.log(
      `${new Date().toISOString()} - ${req.method} ${req.url} - ${statusColor}${status}\x1b[0m - ${duration}ms`
    );
  });

  next();
};
