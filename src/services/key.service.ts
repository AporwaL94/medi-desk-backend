import crypto from 'crypto';

export function generateActivationKey() {
  const parts = Array.from({ length: 3 }, () =>
    crypto.randomBytes(2).toString('hex').toUpperCase()
  );

  return `MEDK-${parts.join('-')}`;
}
