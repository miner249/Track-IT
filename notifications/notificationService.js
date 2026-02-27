/**
 * notifications/notificationService.js
 *
 * Supports multiple notification channels:
 *   console  – logs to stdout (always available)
 *   email    – via nodemailer (requires EMAIL_* env vars)
 *   webhook  – HTTP POST to a URL target
 *
 * Add SMS / push channels here as the project grows.
 */

const { v4: uuidv4 } = require('uuid');

class NotificationService {
  /**
   * @param {{ store: object }} opts
   */
  constructor({ store }) {
    this.store = store;
  }

  // ──────────────────────────────────────────────────────────────
  // Subscribe
  // ──────────────────────────────────────────────────────────────

  /**
   * Register a notification target for a bet.
   * @param {{ betId: string, channel?: string, target: string }} opts
   * @returns subscription object
   */
  async subscribe({ betId, channel = 'console', target }) {
    const subscription = {
      id:        uuidv4(),
      betId,
      channel:   channel.toLowerCase(),
      target,
      createdAt: new Date().toISOString(),
    };

    await this.store.addEventLog({
      event_type: 'subscription_created',
      payload:    subscription,
    });

    console.log(`🔔 [Notifications] Subscribed – bet:${betId} → ${channel}:${target}`);
    return subscription;
  }

  // ──────────────────────────────────────────────────────────────
  // Send
  // ──────────────────────────────────────────────────────────────

  /**
   * Dispatch a notification on the given channel.
   * @param {{ channel: string, target: string, subject: string, message: string }} opts
   */
  async send({ channel = 'console', target, subject, message }) {
    const ch = (channel || 'console').toLowerCase();

    try {
      switch (ch) {
        case 'email':
          await this._sendEmail({ to: target, subject, message });
          break;

        case 'webhook':
          await this._sendWebhook({ url: target, subject, message });
          break;

        case 'console':
        default:
          this._logNotification({ target, subject, message });
          break;
      }
    } catch (error) {
      console.error(`❌ [Notifications] Send failed (${ch} → ${target}):`, error.message);
    }
  }

  // ──────────────────────────────────────────────────────────────
  // Channel implementations
  // ──────────────────────────────────────────────────────────────

  _logNotification({ target, subject, message }) {
    console.log(`
╔══════════════════════════════════════
║ 🔔  NOTIFICATION
║  To:      ${target}
║  Subject: ${subject}
╠══════════════════════════════════════
${message
  .split('\n')
  .map((l) => `║  ${l}`)
  .join('\n')}
╚══════════════════════════════════════`);
  }

  async _sendEmail({ to, subject, message }) {
    // Requires: npm install nodemailer
    // Env vars:  EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, EMAIL_FROM
    const nodemailer = (() => {
      try { return require('nodemailer'); }
      catch { return null; }
    })();

    if (!nodemailer) {
      console.warn('⚠️  [Email] nodemailer not installed – falling back to console');
      this._logNotification({ target: to, subject, message });
      return;
    }

    const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, EMAIL_FROM } = process.env;
    if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASS) {
      console.warn('⚠️  [Email] Missing EMAIL_* env vars – falling back to console');
      this._logNotification({ target: to, subject, message });
      return;
    }

    const transporter = nodemailer.createTransport({
      host: EMAIL_HOST,
      port: parseInt(EMAIL_PORT) || 587,
      secure: parseInt(EMAIL_PORT) === 465,
      auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    });

    await transporter.sendMail({
      from: EMAIL_FROM || EMAIL_USER,
      to,
      subject,
      text: message,
    });

    console.log(`✅ [Email] Sent to ${to}: "${subject}"`);
  }

  async _sendWebhook({ url, subject, message }) {
    const fetch = require('node-fetch');

    const response = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ subject, message, timestamp: new Date().toISOString() }),
    });

    if (!response.ok) {
      throw new Error(`Webhook HTTP ${response.status}`);
    }

    console.log(`✅ [Webhook] Posted to ${url}`);
  }
}

module.exports = NotificationService;
