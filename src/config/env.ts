import dotenv from 'dotenv';

dotenv.config();

export const env = {
  databaseUrl: process.env.DATABASE_URL ?? 'sqlite://database.sqlite',
  jwtSecret: process.env.JWT_SECRET ?? 'change-me-in-local-env',
  adminSecret: process.env.ADMIN_SECRET ?? '7772877280',
  gracePeriodDays: Number(process.env.GRACE_PERIOD_DAYS ?? 5),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  emailHost: process.env.EMAIL_HOST ?? '',
  emailPort: Number(process.env.EMAIL_PORT ?? 587),
  emailSecure: process.env.EMAIL_SECURE === 'true',
  emailUser: process.env.EMAIL_USER ?? '',
  emailPass: process.env.EMAIL_PASS ?? '',
  emailFrom: process.env.EMAIL_FROM ?? 'Kirana Desk <no-reply@kiranadesk.com>',
  adminUpiId: process.env.ADMIN_UPI_ID ?? 'kiranadesk@upi',
  latestAppVersion: process.env.LATEST_APP_VERSION ?? '1.0.0',
  latestAppBuild: process.env.LATEST_APP_BUILD ?? '1',
  appDownloadUrl: process.env.APP_DOWNLOAD_URL ?? 'https://bizdesk.kiranadesk.com/download',
  appReleaseNotes: process.env.APP_RELEASE_NOTES ?? 'Initial stable release.\n• Performance improvements.\n• Bug fixes.',
  appMinVersion: process.env.APP_MIN_VERSION ?? '1.0.0'
};
