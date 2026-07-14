const db = require('../config/db');
require('dotenv').config();

async function getSetting(key) {
  try {
    const row = await db.get('SELECT value FROM settings WHERE key = $1', [key]);
    return row ? JSON.parse(row.value) : null;
  } catch (err) {
    return null;
  }
}

const notificationService = {
  sendSMS: async (phone, message) => {
    console.log(`\n--- [SMS SIMULATOR] ---`);
    console.log(`To: ${phone}`);
    console.log(`Message: ${message}`);
    console.log(`-------------------------\n`);
    return { success: true, provider: 'SimulatedSMS' };
  },

  /**
   * Send a WhatsApp message via Meta Cloud API.
   * Falls back to simulator if API credentials are not configured.
   * 
   * @param {string} phone - Patient phone number (with country code, e.g. 919876543210)
   * @param {string} message - Text message body (supports WhatsApp markdown)
   * @param {string|null} pdfUrl - Optional public URL of the PDF document to send as attachment
   * @returns {{ success: boolean, messageId: string|null, provider: string }}
   */
  sendWhatsApp: async (phone, message, pdfUrl = null) => {
    const apiToken = process.env.WHATSAPP_API_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    // Normalize phone: strip leading + or spaces, ensure no +
    const normalizedPhone = String(phone).replace(/[\s+\-()]/g, '');

    // ── Real Meta Cloud API Path ──────────────────────────────────────────────
    if (apiToken && phoneNumberId) {
      const apiUrl = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
      
      try {
        let payload;

        if (pdfUrl) {
          // Send document message with caption
          payload = {
            messaging_product: 'whatsapp',
            to: normalizedPhone,
            type: 'document',
            document: {
              link: pdfUrl,
              caption: message,
              filename: 'Lab_Report.pdf'
            }
          };
        } else {
          // Send text message only
          payload = {
            messaging_product: 'whatsapp',
            to: normalizedPhone,
            type: 'text',
            text: {
              body: message,
              preview_url: false
            }
          };
        }

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const responseData = await response.json();

        if (!response.ok) {
          const errorMsg = responseData?.error?.message || 'WhatsApp API error';
          console.error('[WhatsApp API Error]', errorMsg, responseData);
          return { success: false, messageId: null, provider: 'MetaCloudAPI', error: errorMsg };
        }

        const messageId = responseData?.messages?.[0]?.id || null;
        console.log(`[WhatsApp] Sent via Meta API to ${normalizedPhone}. MsgID: ${messageId}`);
        return { success: true, messageId, provider: 'MetaCloudAPI' };

      } catch (fetchErr) {
        console.error('[WhatsApp] Network error calling Meta API:', fetchErr.message);
        return { success: false, messageId: null, provider: 'MetaCloudAPI', error: fetchErr.message };
      }
    }

    // ── Simulation Fallback ───────────────────────────────────────────────────
    const settings = await getSetting('whatsapp_settings') || {};
    console.log(`\n--- [WHATSAPP SIMULATOR] ---`);
    console.log(`To: ${normalizedPhone}`);
    console.log(`Message: ${message}`);
    if (pdfUrl) {
      console.log(`PDF Attachment: ${pdfUrl}`);
    }
    console.log(`Gateway: ${settings.apiUrl || 'Simulation Mode (no API keys set)'}`);
    console.log(`-----------------------------\n`);
    
    // Simulate random delivery success/failure for realistic testing
    const simSuccess = Math.random() > 0.05; // 95% simulated success rate
    const simMessageId = simSuccess ? `sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` : null;
    
    return { 
      success: simSuccess, 
      messageId: simMessageId,
      provider: 'SimulatedWhatsApp',
      error: simSuccess ? null : 'Simulated delivery failure (5% rate)'
    };
  },

  sendEmail: async (email, subject, htmlContent) => {
    const settings = await getSetting('email_settings') || {};
    console.log(`\n--- [EMAIL SIMULATOR] ---`);
    console.log(`To: ${email}`);
    console.log(`Subject: ${subject}`);
    console.log(`SMTP Host: ${settings.host || 'localdev'}`);
    console.log(`Body (Snippet): ${htmlContent.replace(/<[^>]*>/g, '').substring(0, 150)}...`);
    console.log(`--------------------------\n`);
    return { success: true, provider: 'SimulatedEmail' };
  }
};

module.exports = notificationService;
