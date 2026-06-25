import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';

export function requireAdminSecret(req: Request, res: Response, next: NextFunction) {
  if (req.header('x-admin-secret') !== env.adminSecret) {
    res.status(401).json({ message: 'Invalid admin secret.' });
    return;
  }

  next();
}
