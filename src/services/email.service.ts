import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import fs from 'fs';
import path from 'path';
import { env } from '../config/env';

// Create transporter if SMTP settings exist, otherwise null
const getTransporter = () => {
  if (!env.emailHost || !env.emailUser || !env.emailPass) {
    return null;
  }
  const options: SMTPTransport.Options & { family: 4 } = {
    host: env.emailHost,
    port: env.emailPort,
    secure: env.emailSecure,
    family: 4,
    auth: {
      user: env.emailUser,
      pass: env.emailPass,
    },
  };

  return nodemailer.createTransport(options);
};

// Main helper to send email
async function sendMail(to: string, subject: string, html: string, emailType: string) {
  let fallbackReason = 'No email provider configured';
  const transporter = getTransporter();

  if (transporter) {
    try {
      await transporter.sendMail({
        from: env.emailFrom,
        to,
        subject,
        html,
      });
      console.log(`[EmailService] Email sent successfully to ${to} (Type: ${emailType})`);
      return true;
    } catch (error) {
      fallbackReason = `SMTP error: ${error instanceof Error ? error.message : String(error)}`;
      console.error(`[EmailService] Failed to send email to ${to}:`, error);
    }
  }

  // Fallback / Development mode: Write to local folder
  try {
    const dir = path.join(process.cwd(), 'sent_emails');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const filename = `email_${Date.now()}_${emailType}.html`;
    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, html, 'utf8');
    
    console.log('\n======================================================================');
    console.log(`[MOCK EMAIL SERVICE] Email delivery failed, saved email locally.`);
    console.log(`Reason:   ${fallbackReason}`);
    console.log(`To:       ${to}`);
    console.log(`Subject:  ${subject}`);
    console.log(`File:     file:///${filePath.replace(/\\/g, '/')}`);
    console.log('======================================================================\n');
  } catch (err) {
    console.error('[EmailService] Fallback file write failed:', err);
  }
  return false;
}

// Generate UPI QR link
function generateUpiDetails(shopName: string, amount: number) {
  const payeeVpa = env.adminUpiId;
  const payeeName = 'Kirana Desk';
  const note = `Kirana Desk Subscription - ${shopName}`;
  const upiUrl = `upi://pay?pa=${payeeVpa}&pn=${encodeURIComponent(payeeName)}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(note)}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUrl)}`;
  return { upiUrl, qrUrl, payeeVpa };
}

// CSS Style Block for Premium HTML email
const emailStyles = `
  body { font-family: 'Inter', -apple-system, sans-serif; background-color: #f8fafc; color: #334155; margin: 0; padding: 20px; -webkit-font-smoothing: antialiased; }
  .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05); border: 1px solid #e2e8f0; }
  .header { background: linear-gradient(135deg, #4f46e5, #4338ca); color: #ffffff; padding: 32px 24px; text-align: center; }
  .header h1 { margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; }
  .content { padding: 32px 24px; }
  .lead { font-size: 16px; line-height: 24px; margin-bottom: 24px; color: #475569; }
  .invoice-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px; }
  .invoice-table th { text-align: left; padding: 12px; border-bottom: 2px solid #f1f5f9; color: #64748b; font-weight: 700; text-transform: uppercase; font-size: 11px; }
  .invoice-table td { padding: 12px; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-weight: 600; }
  .invoice-table tr.total td { font-size: 16px; border-bottom: none; font-weight: 800; color: #4f46e5; }
  .qr-container { text-align: center; margin: 32px 0; background: #faf5ff; border: 1px solid #f3e8ff; border-radius: 12px; padding: 24px; }
  .qr-image { border: 4px solid #ffffff; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05); border-radius: 8px; }
  .qr-caption { margin-top: 12px; font-size: 13px; color: #7c3aed; font-weight: 700; }
  .upi-id { margin-top: 6px; font-size: 12px; font-family: monospace; color: #6b7280; }
  .key-box { text-align: center; margin: 32px 0; padding: 24px; background: #f0fdf4; border: 1px dashed #bbf7d0; border-radius: 12px; }
  .key-title { font-size: 12px; font-weight: 800; color: #16a34a; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 10px; }
  .key-value { font-family: 'Courier New', Courier, monospace; font-size: 26px; font-weight: 900; color: #15803d; letter-spacing: 3px; word-break: break-all; }
  .button { display: inline-block; background-color: #4f46e5; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 700; font-size: 14px; text-align: center; margin-top: 10px; }
  .footer { background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px; text-align: center; font-size: 12px; color: #94a3b8; }
  .footer p { margin: 4px 0; }
  .warning-banner { background-color: #fef3c7; border: 1px solid #fde68a; color: #d97706; padding: 12px; border-radius: 8px; margin-bottom: 24px; font-size: 14px; font-weight: 600; text-align: center; }
`;

interface EmailOptions {
  shopName: string;
  email: string;
  plan: string;
  amount: number;
}

export async function sendPaymentRequestEmail({ shopName, email, plan, amount }: EmailOptions) {
  const { qrUrl, payeeVpa } = generateUpiDetails(shopName, amount);
  const subject = `Invoice & Payment QR - Kirana Desk Plan: ${plan.toUpperCase()}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Payment Invoice</title>
      <style>${emailStyles}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>KIRANA DESK</h1>
        </div>
        <div class="content">
          <p class="lead">Hello <strong>${shopName}</strong> Owner,</p>
          <p>Thank you for choosing Kirana Desk billing system. Your activation key request is received! Please pay the invoice amount using the secure UPI payment QR below to unlock your premium activation key.</p>
          
          <table class="invoice-table">
            <thead>
              <tr>
                <th>Subscription Item</th>
                <th>Pricing</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Kirana Desk Software License - <span style="text-transform: capitalize;">${plan}</span></td>
                <td>₹${amount}</td>
              </tr>
              <tr class="total">
                <td>Total Amount Payable</td>
                <td>₹${amount}</td>
              </tr>
            </tbody>
          </table>

          <div class="qr-container">
            <img src="${qrUrl}" alt="UPI QR Code" class="qr-image" width="220" height="220" />
            <div class="qr-caption">Scan to Pay using GPAY, PhonePe or Paytm</div>
            <div class="upi-id">UPI ID: ${payeeVpa}</div>
          </div>

          <p style="font-size: 13px; color: #64748b; line-height: 18px;">
            <em>Note: Once payment is scanned and completed, our admin will verify the transfer and your software activation key will be delivered automatically to this email address.</em>
          </p>
        </div>
        <div class="footer">
          <p>Kirana Desk Subscription Support Team</p>
          <p>Need help? Contact admin at support@kiranadesk.com</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendMail(email, subject, html, 'payment_invoice');
}

export async function sendActivationKeyEmail({ shopName, email, plan, key }: EmailOptions & { key: string }) {
  const subject = `Welcome to Kirana Desk! Your Activation Key is Ready`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Activation Key</title>
      <style>${emailStyles}</style>
    </head>
    <body>
      <div class="container">
        <div class="header" style="background: linear-gradient(135deg, #10b981, #059669);">
          <h1>KIRANA DESK</h1>
        </div>
        <div class="content">
          <p class="lead">Congratulations <strong>${shopName}</strong>,</p>
          <p>Your payment has been successfully verified! Your subscription is now active. Here is your official license activation key to set up Kirana Desk on your billing device:</p>
          
          <div class="key-box">
            <div class="key-title">License Activation Key</div>
            <div class="key-value">${key}</div>
          </div>

          <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 24px;">
            <h3 style="margin-top: 0; font-size: 14px; color: #0f172a;">How to activate Kirana Desk:</h3>
            <ol style="margin-bottom: 0; padding-left: 20px; font-size: 13px; line-height: 20px; color: #475569;">
              <li>Open the Kirana Desk Desktop/Mobile Application on your billing machine.</li>
              <li>When the activation dialog appears, copy and paste the key code exactly as shown above.</li>
              <li>Click <strong>"Activate App"</strong> to unlock high-speed offline syncing, barcode registry, and checkout features.</li>
            </ol>
          </div>

          <table class="invoice-table">
            <thead>
              <tr>
                <th>License Type</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="text-transform: capitalize;">${plan} License</td>
                <td style="color: #16a34a; font-weight: 700;">Verified & Ready</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="footer">
          <p>Thank you for choosing Kirana Desk for your business!</p>
          <p>Support Email: support@kiranadesk.com</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendMail(email, subject, html, 'activation_key');
}

export async function sendRenewalPaymentEmail({ shopName, email, plan, amount }: EmailOptions) {
  const { qrUrl, payeeVpa } = generateUpiDetails(shopName, amount);
  const subject = `Subscription Renewal - Kirana Desk Plan: ${plan.toUpperCase()}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Subscription Renewal Invoice</title>
      <style>${emailStyles}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>KIRANA DESK RENEWAL</h1>
        </div>
        <div class="content">
          <p class="lead">Dear <strong>${shopName}</strong> Owner,</p>
          <p>We hope you are enjoying using Kirana Desk billing machine. This email is sent to allow you to renew your subscription. Please pay the plan price below to keep your offline synchronization active.</p>
          
          <table class="invoice-table">
            <thead>
              <tr>
                <th>Subscription Renewal</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Renewal Plan: <span style="text-transform: capitalize;">${plan}</span></td>
                <td>₹${amount}</td>
              </tr>
              <tr class="total">
                <td>Renewal Total Due</td>
                <td>₹${amount}</td>
              </tr>
            </tbody>
          </table>

          <div class="qr-container">
            <img src="${qrUrl}" alt="UPI QR Code" class="qr-image" width="220" height="220" />
            <div class="qr-caption">Scan to Renew using GPay, Paytm or PhonePe</div>
            <div class="upi-id">UPI ID: ${payeeVpa}</div>
          </div>

          <p style="font-size: 13px; color: #64748b; line-height: 18px;">
            <em>Note: Once payment is scanned and finished, the admin will immediately extend your license duration and clear any lockout screens.</em>
          </p>
        </div>
        <div class="footer">
          <p>Kirana Desk Admin Services</p>
          <p>Support contact: support@kiranadesk.com</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendMail(email, subject, html, 'renewal_invoice');
}

export async function sendRenewalWarningEmail({ shopName, email, plan, amount, daysRemaining, planExpiry }: EmailOptions & { daysRemaining: number; planExpiry: Date }) {
  const { qrUrl, payeeVpa } = generateUpiDetails(shopName, amount);
  const subject = `CRITICAL ALERT: Your Kirana Desk Subscription Expires in ${daysRemaining} Days`;
  const formattedExpiry = planExpiry.toLocaleDateString('en-IN');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Subscription Expiry Warning</title>
      <style>${emailStyles}</style>
    </head>
    <body>
      <div class="container">
        <div class="header" style="background: linear-gradient(135deg, #d97706, #b45309);">
          <h1>KIRANA DESK EXPIRY ALERT</h1>
        </div>
        <div class="content">
          <div class="warning-banner">
            ⚠️ Your billing machine license expires in ${daysRemaining} days on ${formattedExpiry}!
          </div>

          <p class="lead">Hello <strong>${shopName}</strong>,</p>
          <p>Your Kirana Desk subscription is reaching its end date. To avoid device lockout and ensure continuity of automated backups and offline product syncing, please renew your subscription today.</p>
          
          <table class="invoice-table">
            <thead>
              <tr>
                <th>Subscription Status</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Expiration Date</td>
                <td><strong>${formattedExpiry}</strong></td>
              </tr>
              <tr>
                <td>Days Remaining</td>
                <td style="color: #d97706; font-weight: 700;">${daysRemaining} Days left</td>
              </tr>
              <tr>
                <td>Renewal Fee (Plan: <span style="text-transform: capitalize;">${plan}</span>)</td>
                <td>₹${amount}</td>
              </tr>
            </tbody>
          </table>

          <div class="qr-container">
            <img src="${qrUrl}" alt="UPI QR Code" class="qr-image" width="220" height="220" />
            <div class="qr-caption">Scan to Renew Instantly</div>
            <div class="upi-id">UPI ID: ${payeeVpa}</div>
          </div>

          <p style="font-size: 13px; color: #64748b; line-height: 18px; text-align: center;">
            Please complete the payment before <strong>${formattedExpiry}</strong> to prevent any lockout reminder screens.
          </p>
        </div>
        <div class="footer">
          <p>Automated Expiry Warnings - Kirana Desk Support</p>
          <p>Support contact: support@kiranadesk.com</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendMail(email, subject, html, 'expiry_warning');
}
