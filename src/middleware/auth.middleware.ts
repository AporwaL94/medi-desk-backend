import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { Vendor } from '../models';

export interface VendorTokenPayload {
  vendorId: string;
}

export async function requireVendorAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;

  if (!token) {
    res.status(401).json({ message: 'Missing bearer token.' });
    return;
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret) as VendorTokenPayload;
    const vendor = await Vendor.findByPk(payload.vendorId);
    if (!vendor) {
      res.status(401).json({ message: 'Vendor not found.' });
      return;
    }

    res.locals.vendorToken = payload;
    res.locals.vendor = vendor;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token.' });
  }
}
