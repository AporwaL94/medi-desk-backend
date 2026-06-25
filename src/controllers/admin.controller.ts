import { Request, Response } from 'express';
import { Op } from 'sequelize';
import {
  ActivationKey,
  Payment,
  Vendor,
  VendorCustomer,
  VendorInvoice,
  VendorProduct,
  VendorShop
} from '../models';
import { generateActivationKey } from '../services/key.service';
import {
  calculateGracePeriodEnd,
  calculatePlanExpiry,
  getPlanDurationDays,
  isPlanType
} from '../services/subscription.service';
import { env } from '../config/env';
import {
  sendPaymentRequestEmail,
  sendActivationKeyEmail,
  sendRenewalPaymentEmail
} from '../services/email.service';
import {
  upsertProducts,
  upsertInvoices,
  upsertShop,
  upsertCustomers,
  markSynced
} from './sync.controller';

function planAmount(plan: string) {
  if (plan === 'yearly') return 999;
  if (plan === 'lifetime') return 1999;
  return 199;
}

function routeParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function listVendors(req: Request, res: Response) {
  const { status, plan, search } = req.query;
  const where: Record<PropertyKey, unknown> = {};

  if (typeof status === 'string' && status) where.status = status;
  if (typeof plan === 'string' && plan) where.plan = plan;
  if (typeof search === 'string' && search) {
    where[Op.or] = [
      { id: { [Op.like]: `%${search}%` } },
      { deviceName: { [Op.like]: `%${search}%` } },
      { deviceId: { [Op.like]: `%${search}%` } }
    ];
  }

  const vendors = await Vendor.findAll({
    where,
    order: [['createdAt', 'DESC']],
    include: [
      { model: ActivationKey, as: 'activationKey' },
      { model: Payment, as: 'payments' }
    ]
  });

  res.json(vendors);
}

export async function getVendor(req: Request, res: Response) {
  const vendor = await Vendor.findByPk(routeParam(req.params.id), {
    include: [
      { model: ActivationKey, as: 'activationKey' },
      { model: Payment, as: 'payments', separate: true, order: [['paidAt', 'DESC']] },
      { model: VendorShop, as: 'shop' }
    ]
  });

  if (!vendor) {
    res.status(404).json({ message: 'Vendor not found.' });
    return;
  }

  res.json(vendor);
}

export async function updateVendorPlan(req: Request, res: Response) {
  const vendor = await Vendor.findByPk(routeParam(req.params.id));
  const { plan, durationDays } = req.body as { plan?: string; durationDays?: number };

  if (!vendor || !isPlanType(plan)) {
    res.status(400).json({ message: 'Valid vendor and plan are required.' });
    return;
  }

  const now = new Date();
  const planExpiry = plan === 'lifetime'
    ? null
    : (() => {
      const expiry = new Date(now);
      expiry.setDate(expiry.getDate() + Number(durationDays ?? getPlanDurationDays(plan)));
      return expiry;
    })();

  await vendor.update({
    plan,
    planStarted: now,
    planExpiry,
    gracePeriodEnd: calculateGracePeriodEnd(planExpiry, env.gracePeriodDays),
    status: 'active'
  });

  res.json(vendor);
}

export async function revokeVendor(req: Request, res: Response) {
  const vendor = await Vendor.findByPk(routeParam(req.params.id));
  if (!vendor) {
    res.status(404).json({ message: 'Vendor not found.' });
    return;
  }

  await vendor.update({ status: 'revoked' });
  await ActivationKey.update({ status: 'revoked' }, { where: { vendorId: vendor.id } });
  res.json(vendor);
}

export async function restoreVendor(req: Request, res: Response) {
  const vendor = await Vendor.findByPk(routeParam(req.params.id));
  if (!vendor) {
    res.status(404).json({ message: 'Vendor not found.' });
    return;
  }

  await vendor.update({ status: 'active' });
  await ActivationKey.update({ status: 'activated' }, { where: { vendorId: vendor.id } });
  res.json(vendor);
}

export async function resetVendorDevice(req: Request, res: Response) {
  const vendor = await Vendor.findByPk(routeParam(req.params.id));
  if (!vendor) {
    res.status(404).json({ message: 'Vendor not found.' });
    return;
  }

  await vendor.update({ deviceId: `reset-${vendor.id}-${Date.now()}` });
  res.json({ ok: true });
}

export async function vendorProducts(req: Request, res: Response) {
  res.json(await VendorProduct.findAll({ where: { vendorId: routeParam(req.params.id) }, order: [['name', 'ASC']] }));
}

export async function vendorInvoices(req: Request, res: Response) {
  const invoices = await VendorInvoice.findAll({ where: { vendorId: routeParam(req.params.id) }, order: [['invoiceCreatedAt', 'DESC']] });
  const mappedInvoices = invoices.map(i => {
    let parsedItems = i.items;
    if (typeof parsedItems === 'string') {
      try {
        parsedItems = JSON.parse(parsedItems);
      } catch {
        parsedItems = [];
      }
    }
    return {
      ...i.toJSON(),
      items: Array.isArray(parsedItems) ? parsedItems : []
    };
  });
  res.json(mappedInvoices);
}

export async function exportVendorProducts(req: Request, res: Response) {
  const vendorId = routeParam(req.params.id);
  const products = await VendorProduct.findAll({ where: { vendorId }, order: [['name', 'ASC']] });

  const mappedProducts = products.map(p => ({
    id: p.localId,
    name: p.name,
    barcode: p.barcode,
    price: p.price,
    costPrice: p.costPrice,
    stock: p.stock,
    category: p.category,
    expiryDate: p.expiryDate ? p.expiryDate.toISOString() : null,
    imageUrl: p.imageUrl,
    brand: p.brand,
    updatedAt: p.remoteUpdatedAt ? p.remoteUpdatedAt.toISOString() : null
  }));

  res.setHeader('Content-Disposition', `attachment; filename="products_export_${vendorId}.json"`);
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(mappedProducts, null, 2));
}

export async function exportVendorInvoices(req: Request, res: Response) {
  const vendorId = routeParam(req.params.id);
  const invoices = await VendorInvoice.findAll({ where: { vendorId }, order: [['invoiceCreatedAt', 'DESC']] });

  const mappedInvoices = invoices.map(i => {
    let parsedItems = i.items;
    if (typeof parsedItems === 'string') {
      try {
        parsedItems = JSON.parse(parsedItems);
      } catch {
        parsedItems = [];
      }
    }
    return {
      id: i.localId,
      invoiceNumber: i.invoiceNumber,
      totalAmount: i.totalAmount,
      customerName: i.customerName,
      customerPhone: i.customerPhone,
      items: Array.isArray(parsedItems) ? parsedItems : [],
      invoiceCreatedAt: i.invoiceCreatedAt.toISOString(),
      updatedAt: i.remoteUpdatedAt ? i.remoteUpdatedAt.toISOString() : null
    };
  });

  res.setHeader('Content-Disposition', `attachment; filename="invoices_export_${vendorId}.json"`);
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(mappedInvoices, null, 2));
}

export async function vendorCustomers(req: Request, res: Response) {
  res.json(await VendorCustomer.findAll({ where: { vendorId: routeParam(req.params.id) }, order: [['name', 'ASC']] }));
}

export async function exportVendorCustomers(req: Request, res: Response) {
  const vendorId = routeParam(req.params.id);
  const customers = await VendorCustomer.findAll({ where: { vendorId }, order: [['name', 'ASC']] });

  const mappedCustomers = customers.map(c => ({
    id: c.localId,
    name: c.name,
    mobile: c.mobile,
    address: c.address,
    createdAt: c.customerCreatedAt ? c.customerCreatedAt.toISOString() : null,
    updatedAt: c.remoteUpdatedAt ? c.remoteUpdatedAt.toISOString() : null
  }));

  res.setHeader('Content-Disposition', `attachment; filename="customers_export_${vendorId}.json"`);
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(mappedCustomers, null, 2));
}

export async function clearVendorSyncData(req: Request, res: Response) {
  const vendorId = routeParam(req.params.id);
  const vendor = await Vendor.findByPk(vendorId);

  if (!vendor) {
    res.status(404).json({ message: 'Vendor not found.' });
    return;
  }

  await Promise.all([
    VendorProduct.destroy({ where: { vendorId } }),
    VendorInvoice.destroy({ where: { vendorId } }),
    VendorCustomer.destroy({ where: { vendorId } }),
    VendorShop.destroy({ where: { vendorId } }),
    vendor.update({ lastSyncAt: null })
  ]);

  res.json({ ok: true, message: 'Vendor sync data cleared successfully.' });
}



export async function generateKeys(req: Request, res: Response) {
  const count = Math.max(1, Math.min(500, Number(req.body.count ?? 1)));
  const plan = isPlanType(req.body.plan) ? req.body.plan : 'monthly';
  const label = typeof req.body.label === 'string' ? req.body.label : null;
  const keys = [];

  while (keys.length < count) {
    const key = generateActivationKey();
    const [record, created] = await ActivationKey.findOrCreate({
      where: { key },
      defaults: { key, plan, label, status: 'unused', vendorId: null }
    });
    if (created) keys.push(record);
  }

  res.status(201).json(keys);
}

export async function listKeys(_req: Request, res: Response) {
  const keys = await ActivationKey.findAll({
    order: [['createdAt', 'DESC']],
    include: [{ model: Vendor, as: 'vendor' }]
  });
  res.json(keys);
}

export async function deleteKey(req: Request, res: Response) {
  const key = await ActivationKey.findByPk(routeParam(req.params.id));
  if (!key) {
    res.status(404).json({ message: 'Key not found.' });
    return;
  }

  if (key.status === 'activated') {
    res.status(409).json({ message: 'Active subscription keys cannot be deleted directly. Revoke them first.' });
    return;
  }

  if (key.vendorId) {
    const vendor = await Vendor.findByPk(key.vendorId);
    if (vendor) {
      // Safely unlink the vendor and reset status
      await vendor.update({ plan: 'none', status: 'inactive' });
    }
  }

  await key.destroy();
  res.json({ ok: true });
}

export async function revokeKey(req: Request, res: Response) {
  const key = await ActivationKey.findByPk(routeParam(req.params.id));
  if (!key) {
    res.status(404).json({ message: 'Key not found.' });
    return;
  }

  await key.update({ status: 'revoked' });
  if (key.vendorId) {
    await Vendor.update({ status: 'revoked' }, { where: { id: key.vendorId } });
  }

  res.json(key);
}

export async function recordPayment(req: Request, res: Response) {
  const { vendorId, amount, plan, method, reference, notes } = req.body as {
    vendorId?: string;
    amount?: number;
    plan?: string;
    method?: string;
    reference?: string;
    notes?: string;
  };

  const vendor = vendorId ? await Vendor.findByPk(vendorId) : null;
  if (!vendor || !isPlanType(plan)) {
    res.status(400).json({ message: 'Valid vendorId and plan are required.' });
    return;
  }

  const duration = getPlanDurationDays(plan) ?? 99999;
  const now = new Date();
  const baseDate = vendor.planExpiry && vendor.planExpiry > now ? vendor.planExpiry : now;
  const planExpiry = plan === 'lifetime' ? null : calculatePlanExpiry(plan, baseDate);

  const payment = await Payment.create({
    vendorId: vendor.id,
    amount: Number(amount ?? planAmount(plan)),
    plan,
    method: method ?? 'cash',
    reference: reference ?? null,
    notes: notes ?? null,
    durationDays: duration
  });

  await vendor.update({
    plan,
    planStarted: now,
    planExpiry,
    gracePeriodEnd: calculateGracePeriodEnd(planExpiry, env.gracePeriodDays),
    status: 'active'
  });

  res.status(201).json({ payment, vendor });
}

export async function listPayments(_req: Request, res: Response) {
  const payments = await Payment.findAll({
    order: [['paidAt', 'DESC']],
    include: [
      { model: Vendor, as: 'vendor' },
      { model: ActivationKey, as: 'activationKey' }
    ]
  });
  res.json(payments);
}

export async function vendorPayments(req: Request, res: Response) {
  res.json(await Payment.findAll({ where: { vendorId: routeParam(req.params.id) }, order: [['paidAt', 'DESC']] }));
}

export async function analyticsOverview(_req: Request, res: Response) {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [totalVendors, activeVendors, revenueAll, revenueMonth, graceVendors, recentPayments] = await Promise.all([
    Vendor.count(),
    Vendor.count({ where: { status: 'active' } }),
    Payment.sum('amount'),
    Payment.sum('amount', { where: { paidAt: { [Op.gte]: startOfMonth } } }),
    Vendor.count({ where: { status: 'grace' } }),
    Payment.findAll({ limit: 5, order: [['paidAt', 'DESC']], include: [{ model: Vendor, as: 'vendor' }] })
  ]);

  res.json({
    totalVendors,
    activeVendors,
    revenueAll: revenueAll ?? 0,
    revenueMonth: revenueMonth ?? 0,
    graceVendors,
    recentPayments
  });
}

export async function analyticsRevenue(_req: Request, res: Response) {
  const payments = await Payment.findAll({ order: [['paidAt', 'ASC']] });
  const byMonth = new Map<string, number>();

  for (const payment of payments) {
    const month = payment.paidAt.toISOString().slice(0, 7);
    byMonth.set(month, (byMonth.get(month) ?? 0) + payment.amount);
  }

  res.json([...byMonth.entries()].map(([month, amount]) => ({ month, amount })));
}

export async function analyticsSubscriptions(_req: Request, res: Response) {
  const vendors = await Vendor.findAll();
  const breakdown = {
    active: vendors.filter((vendor) => vendor.status === 'active').length,
    expired: vendors.filter((vendor) => vendor.status === 'expired').length,
    grace: vendors.filter((vendor) => vendor.status === 'grace').length,
    revoked: vendors.filter((vendor) => vendor.status === 'revoked').length,
    monthly: vendors.filter((vendor) => vendor.plan === 'monthly').length,
    yearly: vendors.filter((vendor) => vendor.plan === 'yearly').length,
    lifetime: vendors.filter((vendor) => vendor.plan === 'lifetime').length
  };

  res.json(breakdown);
}

export async function createKeyRequest(req: Request, res: Response) {
  const { email, plan, shopName } = req.body as {
    email?: string;
    plan?: string;
    shopName?: string;
  };

  if (!email || !isPlanType(plan) || !shopName) {
    res.status(400).json({ message: 'Email, valid plan, and shopName are required.' });
    return;
  }

  const key = generateActivationKey();
  const keyRecord = await ActivationKey.create({
    key,
    status: 'pending_payment',
    plan,
    label: shopName,
    email,
    shopName,
    vendorId: null
  });

  const amount = planAmount(plan);
  sendPaymentRequestEmail({
    shopName,
    email,
    plan,
    amount
  }).catch(console.error);

  res.status(201).json(keyRecord);
}

export async function confirmKeyPayment(req: Request, res: Response) {
  const keyId = routeParam(req.params.id);
  const { reference, notes, method } = req.body as {
    reference?: string;
    notes?: string;
    method?: string;
  };

  const key = await ActivationKey.findByPk(keyId);
  if (!key) {
    res.status(404).json({ message: 'Activation key not found.' });
    return;
  }

  if (key.status !== 'pending_payment') {
    res.status(400).json({ message: 'This activation key is not in pending_payment status.' });
    return;
  }

  const amount = planAmount(key.plan);
  const duration = getPlanDurationDays(key.plan as any) ?? 99999;

  const payment = await Payment.create({
    vendorId: null,
    activationKeyId: key.id,
    amount,
    plan: key.plan,
    method: method ?? 'upi',
    reference: reference ?? null,
    notes: notes ?? 'Payment confirmed by admin',
    durationDays: duration
  });

  await key.update({ status: 'unused' });

  sendActivationKeyEmail({
    shopName: key.shopName ?? key.label ?? 'Kirana Store',
    email: key.email!,
    plan: key.plan,
    amount,
    key: key.key
  }).catch(console.error);

  res.json({ key, payment });
}

export async function sendVendorRenewal(req: Request, res: Response) {
  const vendorId = routeParam(req.params.id);
  const { email, plan } = req.body as {
    email?: string;
    plan?: string;
  };

  const vendor = await Vendor.findByPk(vendorId, {
    include: [{ model: VendorShop, as: 'shop' }]
  });

  if (!vendor) {
    res.status(404).json({ message: 'Vendor not found.' });
    return;
  }

  if (!email || !isPlanType(plan)) {
    res.status(400).json({ message: 'Email and valid plan are required.' });
    return;
  }

  await vendor.update({ email });

  const shopName = vendor.shop?.shopName ?? vendor.deviceName ?? 'Kirana Shop';
  const amount = planAmount(plan);

  sendRenewalPaymentEmail({
    shopName,
    email,
    plan,
    amount
  }).catch(console.error);

  res.json({ ok: true });
}

export async function resendKeyEmail(req: Request, res: Response) {
  const keyId = routeParam(req.params.id);
  const key = await ActivationKey.findByPk(keyId);

  if (!key) {
    res.status(404).json({ message: 'Activation key not found.' });
    return;
  }

  if (!key.email) {
    res.status(400).json({ message: 'This activation key has no email address associated with it.' });
    return;
  }

  const amount = planAmount(key.plan);

  try {
    if (key.status === 'pending_payment') {
      // Resend payment request invoice
      sendPaymentRequestEmail({
        shopName: key.shopName ?? key.label ?? 'Kirana Store',
        email: key.email,
        plan: key.plan,
        amount
      }).catch(console.error);
      res.json({ ok: true, message: 'Payment request email resent successfully.' });
    } else {
      // Resend activation key email
      sendActivationKeyEmail({
        shopName: key.shopName ?? key.label ?? 'Kirana Store',
        email: key.email,
        plan: key.plan,
        amount,
        key: key.key
      }).catch(console.error);
      res.json({ ok: true, message: 'Activation key email resent successfully.' });
    }
  } catch (error: any) {
    console.error(`[AdminController] Failed to resend email:`, error);
    res.status(500).json({ message: `Failed to resend email: ${error.message}` });
  }
}

export async function triggerSyncToMobile(req: Request, res: Response) {
  const vendor = await Vendor.findByPk(routeParam(req.params.id));
  if (!vendor) {
    res.status(404).json({ message: 'Vendor not found.' });
    return;
  }

  await vendor.update({ syncToMobilePending: true });
  res.json({ ok: true });
}

export async function importVendorSyncData(req: Request, res: Response) {
  const vendor = await Vendor.findByPk(routeParam(req.params.id));
  if (!vendor) {
    res.status(404).json({ message: 'Vendor not found.' });
    return;
  }

  const { products, invoices, customers, shop } = req.body;

  await upsertProducts(vendor.id, products);
  await upsertInvoices(vendor.id, invoices);
  await upsertCustomers(vendor.id, customers);
  await upsertShop(vendor.id, shop);
  await markSynced(vendor);

  await vendor.update({ syncToMobilePending: true });

  res.json({ ok: true, lastSyncAt: vendor.lastSyncAt });
}

