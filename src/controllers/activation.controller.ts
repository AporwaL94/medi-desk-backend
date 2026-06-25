import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { ActivationKey, Vendor, VendorShop, Payment } from '../models';
import { catchAsync } from '../utils/catch-async';
import {
  calculateGracePeriodEnd,
  calculatePlanExpiry,
  isPlanType,
  resolveSubscriptionState
} from '../services/subscription.service';

function signVendorToken(vendorId: string) {
  return jwt.sign({ vendorId }, env.jwtSecret, { expiresIn: '30d' });
}

export const activate = catchAsync(async (req: Request, res: Response) => {
  const { key, deviceId, deviceName } = req.body as {
    key?: string;
    deviceId?: string;
    deviceName?: string;
  };

  if (!key || !deviceId) {
    res.status(400).json({ message: 'Activation key and deviceId are required.' });
    return;
  }

  const activationKey = await ActivationKey.findOne({ where: { key: key.trim().toUpperCase() } });
  if (!activationKey) {
    res.status(404).json({ message: 'Invalid activation key.' });
    return;
  }

  if (activationKey.status === 'revoked') {
    res.status(403).json({ message: 'Activation key has been revoked.' });
    return;
  }

  if (activationKey.status === 'pending_payment') {
    res.status(402).json({ message: 'Payment is pending for this activation key.' });
    return;
  }

  if (activationKey.status === 'activated') {
    const existingVendor = activationKey.vendorId
      ? await Vendor.findByPk(activationKey.vendorId)
      : null;

    if (!existingVendor) {
      res.status(404).json({ message: 'Vendor not found for this activation key.' });
      return;
    }

    if (existingVendor.deviceId.startsWith('reset-')) {
      const existingDeviceVendor = await Vendor.findOne({ where: { deviceId } });
      if (existingDeviceVendor && !existingDeviceVendor.deviceId.startsWith('reset-')) {
        res.status(409).json({ message: 'This device is already registered with another activation key. Please ask the administrator to de-register the existing device before activating a new key.' });
        return;
      }

      await existingVendor.update({
        deviceId,
        deviceName: deviceName ?? existingVendor.deviceName
      });

      res.json({
        token: signVendorToken(existingVendor.id),
        vendorId: existingVendor.id,
        plan: existingVendor.plan,
        planExpiry: existingVendor.planExpiry,
        status: resolveSubscriptionState(existingVendor)
      });
      return;
    }

    if (existingVendor.deviceId !== deviceId) {
      res.status(409).json({ message: 'Activation key is already used on another device.' });
      return;
    }

    res.json({
      token: signVendorToken(existingVendor.id),
      vendorId: existingVendor.id,
      plan: existingVendor.plan,
      planExpiry: existingVendor.planExpiry,
      status: resolveSubscriptionState(existingVendor)
    });
    return;
  }

  if (!isPlanType(activationKey.plan)) {
    res.status(400).json({ message: 'Activation key has an invalid plan.' });
    return;
  }

  const existingDeviceVendor = await Vendor.findOne({ where: { deviceId } });
  if (existingDeviceVendor && !existingDeviceVendor.deviceId.startsWith('reset-')) {
    res.status(409).json({ message: 'This device is already registered with another activation key. Please ask the administrator to de-register the existing device before activating a new key.' });
    return;
  }

  const now = new Date();
  const planExpiry = calculatePlanExpiry(activationKey.plan, now);
  const gracePeriodEnd = calculateGracePeriodEnd(planExpiry, env.gracePeriodDays);

  const [vendor] = await Vendor.findOrCreate({
    where: { deviceId },
    defaults: {
      deviceId,
      deviceName: deviceName ?? null,
      activatedAt: now,
      plan: activationKey.plan,
      planStarted: now,
      planExpiry,
      gracePeriodEnd,
      status: 'active',
      email: activationKey.email ?? null,
      notes: null,
      lastSyncAt: null
    }
  });

  await vendor.update({
    deviceName: deviceName ?? vendor.deviceName,
    activatedAt: vendor.activatedAt ?? now,
    plan: activationKey.plan,
    planStarted: now,
    planExpiry,
    gracePeriodEnd,
    email: activationKey.email ?? vendor.email,
    status: 'active'
  });

  if (activationKey.shopName) {
    await VendorShop.findOrCreate({
      where: { vendorId: vendor.id },
      defaults: {
        vendorId: vendor.id,
        shopName: activationKey.shopName,
        address: null,
        phone: null,
        whatsappNumber: null,
        upiId: null,
        gstin: null,
        logoUrl: null,
        footerMessage: null,
        remoteUpdatedAt: null
      }
    });
  }

  await Payment.update(
    { vendorId: vendor.id },
    { where: { activationKeyId: activationKey.id, vendorId: null } }
  );

  await activationKey.update({
    status: 'activated',
    vendorId: vendor.id
  });

  res.json({
    token: signVendorToken(vendor.id),
    vendorId: vendor.id,
    plan: vendor.plan,
    planExpiry: vendor.planExpiry,
    status: 'active'
  });
});

export const validateToken = catchAsync(async (_req: Request, res: Response) => {
  const vendor = res.locals.vendor as Vendor;
  const status = resolveSubscriptionState(vendor);

  if (status === 'revoked') {
    res.status(403).json({ valid: false, status, message: 'Licence revoked.' });
    return;
  }

  if (status === 'expired') {
    await vendor.update({ status: 'expired' });
    res.status(402).json({ valid: false, status, message: 'Subscription expired.' });
    return;
  }

  if (vendor.status !== status) {
    await vendor.update({ status });
  }

  res.json({
    valid: true,
    vendorId: vendor.id,
    plan: vendor.plan,
    planExpiry: vendor.planExpiry,
    gracePeriodEnd: vendor.gracePeriodEnd,
    status
  });
});

export const getSubscriptionStatus = catchAsync(async (_req: Request, res: Response) => {
  const vendor = res.locals.vendor as Vendor;
  const status = resolveSubscriptionState(vendor);
  const daysRemaining = vendor.planExpiry
    ? Math.ceil((vendor.planExpiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  res.json({
    vendorId: vendor.id,
    plan: vendor.plan,
    planExpiry: vendor.planExpiry,
    gracePeriodEnd: vendor.gracePeriodEnd,
    status,
    daysRemaining
  });
});

export const getVersionCheck = catchAsync(async (_req: Request, res: Response) => {
  res.json({
    latestVersion: env.latestAppVersion,
    latestBuildNumber: env.latestAppBuild,
    downloadUrl: env.appDownloadUrl,
    releaseNotes: env.appReleaseNotes,
    minVersion: env.appMinVersion,
  });
});

