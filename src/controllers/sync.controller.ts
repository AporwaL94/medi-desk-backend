import { Request, Response } from 'express';
import { Op, Sequelize } from 'sequelize';
import { Vendor, VendorCustomer, VendorInvoice, VendorProduct, VendorShop } from '../models';
import { catchAsync } from '../utils/catch-async';

type ProductPayload = {
  localId?: string;
  id?: string;
  name?: string;
  barcode?: string;
  price?: number;
  costPrice?: number;
  stock?: number;
  category?: string;
  expiryDate?: string;
  imageUrl?: string;
  brand?: string;
  batchNumber?: string;
  genericName?: string;
  prescriptionRequired?: boolean;
  gstRate?: number;
  hsnCode?: string;
  minStockLevel?: number;
  supplierName?: string;
  rackLocation?: string;
  packSize?: string;
  updatedAt?: string;
};

type InvoicePayload = {
  localId?: string;
  id?: string;
  invoiceNumber?: string;
  totalAmount?: number;
  customerName?: string;
  customerPhone?: string;
  customerMobile?: string;
  items?: object[];
  invoiceCreatedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

type CustomerPayload = {
  localId?: string;
  id?: string;
  name?: string;
  mobile?: string;
  address?: string;
  createdAt?: string;
  updatedAt?: string;
};

function parseDate(value?: string | null) {
  if (!value) return null;
  let dateStr = value.trim();
  if (
    !dateStr.endsWith('Z') &&
    !/\+\d{2}:?\d{2}$/.test(dateStr) &&
    !/-\d{2}:?\d{2}$/.test(dateStr)
  ) {
    dateStr = dateStr + '+05:30';
  }
  return new Date(dateStr);
}

export async function upsertProducts(vendorId: string, products: ProductPayload[] = []) {
  const incomingLocalIds = products
    .map(p => p.localId ?? p.id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);

  if (incomingLocalIds.length > 0) {
    await VendorProduct.destroy({
      where: {
        vendorId,
        [Op.or]: [
          {
            localId: {
              [Op.notIn]: incomingLocalIds
            }
          },
          {
            localId: null
          },
          {
            localId: ''
          }
        ]
      } as any
    });
  } else {
    await VendorProduct.destroy({
      where: {
        vendorId
      }
    });
  }

  for (const product of products) {
    const localId = product.localId ?? product.id;
    if (!localId || !product.name) {
      continue;
    }

    const price = Number(product.price ?? 0);
    const costPrice = product.costPrice ?? null;
    const stock = Number(product.stock ?? 0);
    const expiryDate = parseDate(product.expiryDate);
    const remoteUpdatedAt = parseDate(product.updatedAt);

    const barcode = product.barcode ? product.barcode.trim() : null;
    const name = product.name ? product.name.trim() : '';

    // Check for existing product vendor-wise:
    // 1. Check by localId
    let existing = await VendorProduct.findOne({ where: { vendorId, localId } });
    let matchMethod = '';

    if (existing) {
      matchMethod = 'localId';
    }

    // 2. If not found, check by standard barcode (case-insensitive and trimmed)
    if (!existing && barcode && !barcode.toUpperCase().startsWith('MANUAL')) {
      existing = await VendorProduct.findOne({
        where: {
          vendorId,
          [Op.and]: [
            Sequelize.where(
              Sequelize.fn('LOWER', Sequelize.fn('TRIM', Sequelize.col('barcode'))),
              barcode.toLowerCase()
            )
          ]
        }
      });
      if (existing) {
        matchMethod = 'barcode';
      }
    }

    // 3. If still not found, check by exact name (case-insensitive and trimmed)
    if (!existing && name) {
      existing = await VendorProduct.findOne({
        where: {
          vendorId,
          [Op.and]: [
            Sequelize.where(
              Sequelize.fn('LOWER', Sequelize.fn('TRIM', Sequelize.col('name'))),
              name.toLowerCase()
            )
          ]
        }
      });
      if (existing) {
        matchMethod = 'name';
      }
    }

    if (existing) {
      if (matchMethod !== 'localId') {
        console.log(`[Sync] Matching existing product "${existing.name}" (ID: ${existing.id}, old localId: ${existing.localId}) to new localId "${localId}" via ${matchMethod}.`);
      }

      const isSame =
        existing.localId === localId &&
        existing.name === name &&
        existing.barcode === barcode &&
        Number(existing.price) === price &&
        (existing.costPrice === null ? null : Number(existing.costPrice)) === costPrice &&
        Number(existing.stock) === stock &&
        existing.category === (product.category ?? null) &&
        (existing.expiryDate?.getTime() ?? null) === (expiryDate?.getTime() ?? null) &&
        existing.imageUrl === (product.imageUrl ?? null) &&
        existing.brand === (product.brand ?? null) &&
        existing.batchNumber === (product.batchNumber ?? null) &&
        existing.genericName === (product.genericName ?? null) &&
        existing.prescriptionRequired === (product.prescriptionRequired ?? false) &&
        Number(existing.gstRate) === Number(product.gstRate ?? 12.0) &&
        existing.hsnCode === (product.hsnCode ?? null) &&
        existing.minStockLevel === (product.minStockLevel ?? 5) &&
        existing.supplierName === (product.supplierName ?? null) &&
        existing.rackLocation === (product.rackLocation ?? null) &&
        existing.packSize === (product.packSize ?? null);

      if (isSame) {
        continue;
      }

      await existing.update({
        localId, // Update localId in case it changed (uninstall/reinstall)
        name,
        barcode,
        price,
        costPrice,
        stock,
        category: product.category ?? null,
        expiryDate,
        imageUrl: product.imageUrl ?? null,
        brand: product.brand ?? null,
        batchNumber: product.batchNumber ?? null,
        genericName: product.genericName ?? null,
        prescriptionRequired: product.prescriptionRequired ?? false,
        gstRate: product.gstRate ?? 12.0,
        hsnCode: product.hsnCode ?? null,
        minStockLevel: product.minStockLevel ?? 5,
        supplierName: product.supplierName ?? null,
        rackLocation: product.rackLocation ?? null,
        packSize: product.packSize ?? null,
        remoteUpdatedAt
      });
    } else {
      await VendorProduct.create({
        vendorId,
        localId,
        name,
        barcode,
        price,
        costPrice,
        stock,
        category: product.category ?? null,
        expiryDate,
        imageUrl: product.imageUrl ?? null,
        brand: product.brand ?? null,
        batchNumber: product.batchNumber ?? null,
        genericName: product.genericName ?? null,
        prescriptionRequired: product.prescriptionRequired ?? false,
        gstRate: product.gstRate ?? 12.0,
        hsnCode: product.hsnCode ?? null,
        minStockLevel: product.minStockLevel ?? 5,
        supplierName: product.supplierName ?? null,
        rackLocation: product.rackLocation ?? null,
        packSize: product.packSize ?? null,
        remoteUpdatedAt
      });
    }
  }
}

export async function upsertInvoices(vendorId: string, invoices: InvoicePayload[] = []) {
  for (const invoice of invoices) {
    const localId = invoice.localId ?? invoice.id;
    const invoiceCreatedAt = parseDate(invoice.invoiceCreatedAt ?? invoice.createdAt);
    if (!localId || !invoice.invoiceNumber || !invoiceCreatedAt) {
      continue;
    }

    let parsedItems = invoice.items ?? [];
    if (typeof parsedItems === 'string') {
      try {
        parsedItems = JSON.parse(parsedItems);
      } catch {
        parsedItems = [];
      }
    }

    const totalAmount = Number(invoice.totalAmount ?? 0);
    const customerName = invoice.customerName ?? null;
    const customerPhone = invoice.customerPhone ?? invoice.customerMobile ?? null;
    const remoteUpdatedAt = parseDate(invoice.updatedAt);

    const existing = await VendorInvoice.findOne({ where: { vendorId, localId } });
    if (existing) {
      const isSame =
        existing.invoiceNumber === invoice.invoiceNumber &&
        Number(existing.totalAmount) === totalAmount &&
        existing.customerName === customerName &&
        existing.customerPhone === customerPhone &&
        (existing.invoiceCreatedAt?.getTime() ?? null) === (invoiceCreatedAt?.getTime() ?? null) &&
        JSON.stringify(existing.items) === JSON.stringify(parsedItems);

      if (isSame) {
        continue;
      }

      await existing.update({
        invoiceNumber: invoice.invoiceNumber,
        totalAmount,
        customerName,
        customerPhone,
        items: Array.isArray(parsedItems) ? parsedItems : [],
        invoiceCreatedAt,
        remoteUpdatedAt
      });
    } else {
      await VendorInvoice.create({
        vendorId,
        localId,
        invoiceNumber: invoice.invoiceNumber,
        totalAmount,
        customerName,
        customerPhone,
        items: Array.isArray(parsedItems) ? parsedItems : [],
        invoiceCreatedAt,
        remoteUpdatedAt
      });
    }
  }
}

export async function upsertShop(vendorId: string, shop?: Record<string, unknown>) {
  if (!shop) {
    return;
  }

  const shopName = (shop.shopName ?? shop.name ?? null) as string | null;
  const address = (shop.address ?? shop.addressLine1 ?? null) as string | null;
  const phone = (shop.phone ?? shop.phoneNumber ?? null) as string | null;
  const whatsappNumber = (shop.whatsappNumber ?? null) as string | null;
  const upiId = (shop.upiId ?? null) as string | null;
  const gstin = (shop.gstin ?? null) as string | null;
  const logoUrl = (shop.logoUrl ?? null) as string | null;
  const footerMessage = (shop.footerMessage ?? shop.footerText ?? null) as string | null;
  const dlNumber = (shop.dlNumber ?? null) as string | null;
  const remoteUpdatedAt = parseDate(shop.updatedAt as string | undefined);

  const existing = await VendorShop.findOne({ where: { vendorId } });
  if (existing) {
    const isSame =
      existing.shopName === shopName &&
      existing.address === address &&
      existing.phone === phone &&
      existing.whatsappNumber === whatsappNumber &&
      existing.upiId === upiId &&
      existing.gstin === gstin &&
      existing.logoUrl === logoUrl &&
      existing.footerMessage === footerMessage &&
      existing.dlNumber === dlNumber;

    if (isSame) {
      return;
    }

    await existing.update({
      shopName,
      address,
      phone,
      whatsappNumber,
      upiId,
      gstin,
      logoUrl,
      footerMessage,
      dlNumber,
      remoteUpdatedAt
    });
  } else {
    await VendorShop.create({
      vendorId,
      shopName,
      address,
      phone,
      whatsappNumber,
      upiId,
      gstin,
      logoUrl,
      footerMessage,
      dlNumber,
      remoteUpdatedAt
    });
  }
}

export async function upsertCustomers(vendorId: string, customers: CustomerPayload[] = []) {
  const incomingLocalIds = customers
    .map(c => c.localId ?? c.id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);

  if (incomingLocalIds.length > 0) {
    await VendorCustomer.destroy({
      where: {
        vendorId,
        [Op.or]: [
          {
            localId: {
              [Op.notIn]: incomingLocalIds
            }
          },
          {
            localId: null
          },
          {
            localId: ''
          }
        ]
      } as any
    });
  } else {
    await VendorCustomer.destroy({
      where: {
        vendorId
      }
    });
  }

  for (const customer of customers) {
    const localId = customer.localId ?? customer.id;
    if (!localId || !customer.name) {
      continue;
    }

    const name = customer.name;
    const mobile = customer.mobile ?? null;
    const address = customer.address ?? null;
    const customerCreatedAt = parseDate(customer.createdAt);
    const remoteUpdatedAt = parseDate(customer.updatedAt);

    const existing = await VendorCustomer.findOne({ where: { vendorId, localId } });
    if (existing) {
      const isSame =
        existing.name === name &&
        existing.mobile === mobile &&
        existing.address === address &&
        (existing.customerCreatedAt?.getTime() ?? null) === (customerCreatedAt?.getTime() ?? null);

      if (isSame) {
        continue;
      }

      await existing.update({
        name,
        mobile,
        address,
        customerCreatedAt,
        remoteUpdatedAt
      });
    } else {
      await VendorCustomer.create({
        vendorId,
        localId,
        name,
        mobile,
        address,
        customerCreatedAt,
        remoteUpdatedAt
      });
    }
  }
}

export async function markSynced(vendor: Vendor) {
  await vendor.update({ lastSyncAt: new Date() });
}

export const pushSync = catchAsync(async (req: Request, res: Response) => {
  const vendor = res.locals.vendor as Vendor;
  await upsertProducts(vendor.id, req.body.products);
  await upsertInvoices(vendor.id, req.body.invoices);
  await upsertCustomers(vendor.id, req.body.customers);
  await upsertShop(vendor.id, req.body.shop);
  await markSynced(vendor);
  res.json({ ok: true, syncedAt: vendor.lastSyncAt ?? new Date() });
});

export const pullSync = catchAsync(async (_req: Request, res: Response) => {
  const vendor = res.locals.vendor as Vendor;
  const [products, invoices, customers, shop] = await Promise.all([
    VendorProduct.findAll({ where: { vendorId: vendor.id }, order: [['updatedAt', 'DESC']] }),
    VendorInvoice.findAll({ where: { vendorId: vendor.id }, order: [['invoiceCreatedAt', 'DESC']] }),
    VendorCustomer.findAll({ where: { vendorId: vendor.id }, order: [['name', 'ASC']] }),
    VendorShop.findOne({ where: { vendorId: vendor.id } })
  ]);

  if (vendor.syncToMobilePending) {
    await vendor.update({ syncToMobilePending: false });
  }

  res.json({ products, invoices, customers, shop });
});

export const pushProducts = catchAsync(async (req: Request, res: Response) => {
  const vendor = res.locals.vendor as Vendor;
  await upsertProducts(vendor.id, req.body.products ?? req.body);
  await markSynced(vendor);
  res.json({ ok: true, syncedAt: new Date() });
});

export const pushInvoices = catchAsync(async (req: Request, res: Response) => {
  const vendor = res.locals.vendor as Vendor;
  await upsertInvoices(vendor.id, req.body.invoices ?? req.body);
  await markSynced(vendor);
  res.json({ ok: true, syncedAt: new Date() });
});

export const pushShop = catchAsync(async (req: Request, res: Response) => {
  const vendor = res.locals.vendor as Vendor;
  await upsertShop(vendor.id, req.body.shop ?? req.body);
  await markSynced(vendor);
  res.json({ ok: true, syncedAt: new Date() });
});

export const pushCustomers = catchAsync(async (req: Request, res: Response) => {
  const vendor = res.locals.vendor as Vendor;
  await upsertCustomers(vendor.id, req.body.customers ?? req.body);
  await markSynced(vendor);
  res.json({ ok: true, syncedAt: new Date() });
});

export const syncStatus = catchAsync(async (_req: Request, res: Response) => {
  const vendor = res.locals.vendor as Vendor;
  const [productCount, invoiceCount, customerCount] = await Promise.all([
    VendorProduct.count({ where: { vendorId: vendor.id } }),
    VendorInvoice.count({ where: { vendorId: vendor.id } }),
    VendorCustomer.count({ where: { vendorId: vendor.id } })
  ]);

  res.json({
    lastSync: vendor.lastSyncAt,
    productCount,
    invoiceCount,
    customerCount,
    pendingRecords: 0
  });
});

export const checkSyncStatus = catchAsync(async (_req: Request, res: Response) => {
  const vendor = res.locals.vendor as Vendor;
  res.json({ syncPending: vendor.syncToMobilePending });
});

