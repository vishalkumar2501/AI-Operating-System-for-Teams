import { env } from '../config/env';
import { logger } from './logger';

interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Thin email abstraction.
 * Currently logs to console so development needs no SMTP setup.
 * Swap the implementation here when EMAIL_PROVIDER=resend is configured.
 */
export async function sendEmail(opts: SendEmailOptions): Promise<void> {
  if (env.EMAIL_PROVIDER === 'console') {
    logger.info(
      {
        to: opts.to,
        subject: opts.subject,
        // Show first 500 chars of body so the log doesn't balloon
        preview: opts.text.slice(0, 500),
      },
      '[email:console] Would send email'
    );
    return;
  }

  // Future: plug in Resend, Ethereal, or SMTP here based on env.EMAIL_PROVIDER
  logger.warn({ provider: env.EMAIL_PROVIDER }, 'Email provider not yet implemented');
}
