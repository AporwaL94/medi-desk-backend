import { Op } from 'sequelize';
import { Vendor, VendorShop } from '../models';
import { sendRenewalWarningEmail } from './email.service';

function getPlanPrice(plan: string): number {
  if (plan === 'yearly') return 999;
  if (plan === 'lifetime') return 1999;
  return 199;
}

export async function runSubscriptionSweep() {
  console.log('[CronService] Running subscription sweep...');
  const now = new Date();

  // 1. Send warning email to vendors expiring in exactly 7 days
  const startOf7thDay = new Date();
  startOf7thDay.setDate(startOf7thDay.getDate() + 7);
  startOf7thDay.setHours(0, 0, 0, 0);

  const endOf7thDay = new Date();
  endOf7thDay.setDate(endOf7thDay.getDate() + 7);
  endOf7thDay.setHours(23, 59, 59, 999);

  try {
    const warningVendors = await Vendor.findAll({
      where: {
        planExpiry: {
          [Op.between]: [startOf7thDay, endOf7thDay]
        },
        status: 'active'
      },
      include: [{ model: VendorShop, as: 'shop' }]
    });

    for (const vendor of warningVendors) {
      const email = vendor.email;
      if (!email) {
        console.log(`[CronService] Skip warning for vendor ${vendor.id}: No email address.`);
        continue;
      }

      const shopName = vendor.shop?.shopName ?? vendor.deviceName ?? 'Kirana Shop';
      const plan = vendor.plan ?? 'monthly';
      const amount = getPlanPrice(plan);

      await sendRenewalWarningEmail({
        shopName,
        email,
        plan,
        amount,
        daysRemaining: 7,
        planExpiry: vendor.planExpiry!
      });
    }
  } catch (error) {
    console.error('[CronService] Error in 7-day warning sweep:', error);
  }

  // 2. Automatically expire vendors whose grace period has ended
  try {
    const expiredVendors = await Vendor.findAll({
      where: {
        status: { [Op.notIn]: ['expired', 'revoked'] },
        planExpiry: { [Op.ne]: null },
        gracePeriodEnd: {
          [Op.lt]: now
        }
      }
    });

    for (const vendor of expiredVendors) {
      await vendor.update({ status: 'expired' });
      console.log(`[CronService] Device ${vendor.deviceName} (${vendor.id}) has been locked out because subscription expired on ${vendor.planExpiry} and grace period ended.`);
    }
  } catch (error) {
    console.error('[CronService] Error in lockout sweep:', error);
  }
}

export function initCronJobs() {
  // Run on startup (after 5 seconds to ensure server booted successfully)
  setTimeout(() => {
    runSubscriptionSweep().catch(console.error);
  }, 5000);

  // Run once every 24 hours (86400000 milliseconds)
  setInterval(() => {
    runSubscriptionSweep().catch(console.error);
  }, 24 * 60 * 60 * 1000);

  console.log('[CronService] Initialized subscription background scheduler (daily interval).');
}
