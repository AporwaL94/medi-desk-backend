import { Router } from 'express';
import { activate, getSubscriptionStatus, validateToken, getVersionCheck } from '../controllers/activation.controller';
import { requireVendorAuth } from '../middleware/auth.middleware';
import { createKeyRequest } from '../controllers/admin.controller';
import { catchAsync } from '../utils/catch-async';

export const activationRoutes = Router();

activationRoutes.post('/activate', activate);
activationRoutes.get('/validate', requireVendorAuth, validateToken);
activationRoutes.get('/subscription/status', requireVendorAuth, getSubscriptionStatus);
activationRoutes.post('/keys/request', catchAsync(createKeyRequest));
activationRoutes.get('/version/check', getVersionCheck);

