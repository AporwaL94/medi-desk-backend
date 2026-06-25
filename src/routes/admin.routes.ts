import { Router } from 'express';
import { requireAdminSecret } from '../middleware/admin.middleware';
import { catchAsync } from '../utils/catch-async';
import {
  analyticsOverview,
  analyticsRevenue,
  analyticsSubscriptions,
  deleteKey,
  generateKeys,
  getVendor,
  listKeys,
  listPayments,
  listVendors,
  recordPayment,
  resetVendorDevice,
  restoreVendor,
  revokeKey,
  revokeVendor,
  updateVendorPlan,
  vendorInvoices,
  vendorPayments,
  vendorProducts,
  exportVendorProducts,
  exportVendorInvoices,
  vendorCustomers,
  exportVendorCustomers,
  clearVendorSyncData,
  createKeyRequest,
  confirmKeyPayment,
  sendVendorRenewal,
  resendKeyEmail,
  triggerSyncToMobile,
  importVendorSyncData
} from '../controllers/admin.controller';

export const adminRoutes = Router();

adminRoutes.use(requireAdminSecret);

adminRoutes.get('/vendors', catchAsync(listVendors));
adminRoutes.get('/vendors/:id', catchAsync(getVendor));
adminRoutes.put('/vendors/:id/plan', catchAsync(updateVendorPlan));
adminRoutes.post('/vendors/:id/revoke', catchAsync(revokeVendor));
adminRoutes.post('/vendors/:id/restore', catchAsync(restoreVendor));
adminRoutes.post('/vendors/:id/reset-device', catchAsync(resetVendorDevice));
adminRoutes.get('/vendors/:id/products', catchAsync(vendorProducts));
adminRoutes.get('/vendors/:id/products/export', catchAsync(exportVendorProducts));
adminRoutes.get('/vendors/:id/invoices', catchAsync(vendorInvoices));
adminRoutes.get('/vendors/:id/invoices/export', catchAsync(exportVendorInvoices));
adminRoutes.get('/vendors/:id/customers', catchAsync(vendorCustomers));
adminRoutes.get('/vendors/:id/customers/export', catchAsync(exportVendorCustomers));
adminRoutes.post('/vendors/:id/clear-sync', catchAsync(clearVendorSyncData));
adminRoutes.post('/vendors/:id/sync-to-mobile', catchAsync(triggerSyncToMobile));
adminRoutes.post('/vendors/:id/import-sync', catchAsync(importVendorSyncData));
adminRoutes.post('/keys/generate', catchAsync(generateKeys));
adminRoutes.post('/keys/request', catchAsync(createKeyRequest));
adminRoutes.post('/keys/:id/confirm-payment', catchAsync(confirmKeyPayment));
adminRoutes.get('/keys', catchAsync(listKeys));
adminRoutes.delete('/keys/:id', catchAsync(deleteKey));
adminRoutes.post('/keys/:id/revoke', catchAsync(revokeKey));
adminRoutes.post('/keys/:id/resend-email', catchAsync(resendKeyEmail));
adminRoutes.post('/vendors/:id/send-renewal', catchAsync(sendVendorRenewal));
adminRoutes.post('/payments', catchAsync(recordPayment));
adminRoutes.get('/payments', catchAsync(listPayments));
adminRoutes.get('/payments/vendor/:id', catchAsync(vendorPayments));
adminRoutes.get('/analytics/overview', catchAsync(analyticsOverview));
adminRoutes.get('/analytics/revenue', catchAsync(analyticsRevenue));
adminRoutes.get('/analytics/subscriptions', catchAsync(analyticsSubscriptions));
