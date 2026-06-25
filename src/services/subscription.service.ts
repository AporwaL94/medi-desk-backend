export type PlanType = 'monthly' | 'yearly' | 'lifetime';

const planDurationDays: Record<PlanType, number | null> = {
  monthly: 30,
  yearly: 365,
  lifetime: null
};

export function calculatePlanExpiry(plan: PlanType, startDate = new Date()) {
  const durationDays = planDurationDays[plan];

  if (durationDays === null) {
    return null;
  }

  const expiry = new Date(startDate);
  expiry.setDate(expiry.getDate() + durationDays);
  return expiry;
}

export function getPlanDurationDays(plan: PlanType) {
  return planDurationDays[plan] ?? 30;
}

export function isPlanType(value: unknown): value is PlanType {
  return value === 'monthly' || value === 'yearly' || value === 'lifetime';
}

export function calculateGracePeriodEnd(expiry: Date | null, graceDays: number) {
  if (!expiry) {
    return null;
  }

  const graceEnd = new Date(expiry);
  graceEnd.setDate(graceEnd.getDate() + graceDays);
  return graceEnd;
}

export function resolveSubscriptionState(vendor: {
  status: string;
  planExpiry: Date | null;
  gracePeriodEnd: Date | null;
}) {
  if (vendor.status === 'revoked') {
    return 'revoked';
  }

  if (!vendor.planExpiry) {
    return 'active';
  }

  const now = Date.now();
  if (vendor.planExpiry.getTime() >= now) {
    return 'active';
  }

  if (vendor.gracePeriodEnd && vendor.gracePeriodEnd.getTime() >= now) {
    return 'grace';
  }

  return 'expired';
}
