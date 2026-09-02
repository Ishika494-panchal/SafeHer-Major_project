/**
 * smsService.js — SafeHer Emergency SMS Dispatcher via TextBee Gateway
 *
 * Uses your connected Android device (Jio SIM) via the TextBee REST API:
 * https://api.textbee.dev/api/v1/gateway/devices/:deviceId/send-sms
 *
 * Completely free, native SIM delivery, no DLT/TRAI restrictions,
 * and delivers real-time emergency tracking links directly to guardian contacts.
 */

import axios from 'axios';

// ---------------------------------------------------------------------------
// normalisePhone — ensure E.164 international format (+91 for Indian numbers)
// ---------------------------------------------------------------------------
export const normalisePhone = (raw) => {
  let num = String(raw).replace(/[\s\-().]/g, '');

  if (num.startsWith('+')) return num;
  num = num.replace(/^0+/, ''); // strip leading zeros

  // Indian 10-digit mobile (starts with 6-9)
  if (/^[6-9]\d{9}$/.test(num)) return `+91${num}`;

  // Already prefixed with 91 (12 digits)
  if (/^91[6-9]\d{9}$/.test(num)) return `+${num}`;

  // Default international format
  return `+${num}`;
};

// ---------------------------------------------------------------------------
// sendSOSAlert — dispatch SMS to emergency contact via TextBee
// ---------------------------------------------------------------------------
/**
 * @param {object}      contact      - { name, phone, relationship }
 * @param {string}      trackingLink - Live tracking URL
 * @param {string}      userName     - Name of user triggering SOS
 * @param {number|null} batteryPct   - Current battery %
 * @returns {Promise<{ success, phone, name, batchId?, error? }>}
 */
export const sendSOSAlert = async (contact, trackingLink, userName, batteryPct = null) => {
  const apiKey   = process.env.TEXTBEE_API_KEY;
  const deviceId = process.env.TEXTBEE_DEVICE_ID;

  if (!apiKey || !deviceId) {
    throw new Error('TEXTBEE_API_KEY or TEXTBEE_DEVICE_ID missing in .env');
  }

  const phone = normalisePhone(contact.phone);
  const batteryStr = batteryPct !== null ? ` (Battery: ${batteryPct}%)` : '';
  const message =
    `🚨 EMERGENCY SOS: ${userName} has triggered a distress alert on SafeHer!${batteryStr} ` +
    `Track live location now: ${trackingLink} - Please respond immediately!`;

  console.log(`📲 TextBee SMS → Sending to ${contact.name} (${phone})...`);

  try {
    const url = `https://api.textbee.dev/api/v1/gateway/devices/${deviceId}/send-sms`;
    const response = await axios.post(
      url,
      {
        recipients: [phone],
        message
      },
      {
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    const result = response.data;
    if (result && (result.data?.success || result.success)) {
      const batchId = result.data?.smsBatchId || result.smsBatchId;
      console.log(`✅ TextBee SMS queued for ${contact.name} (${phone}) — Batch ID: ${batchId}`);
      return { success: true, phone, name: contact.name, batchId };
    } else {
      const errMsg = result.message || JSON.stringify(result);
      console.error(`❌ TextBee returned error for ${contact.name}: ${errMsg}`);
      return { success: false, phone, name: contact.name, error: errMsg };
    }
  } catch (err) {
    const errDetail = err.response?.data
      ? JSON.stringify(err.response.data)
      : err.message;
    console.error(`❌ TextBee request failed for ${contact.name} (${phone}): ${errDetail}`);
    return { success: false, phone, name: contact.name, error: errDetail };
  }
};

// ---------------------------------------------------------------------------
// notifyAllContacts — send SMS to all contacts in parallel
// ---------------------------------------------------------------------------
/**
 * @param {object[]}    contacts
 * @param {string}      trackingLink
 * @param {string}      userName
 * @param {number|null} batteryPct
 * @returns {Promise<{ notified: object[], failed: object[] }>}
 */
export const notifyAllContacts = async (contacts, trackingLink, userName, batteryPct = null) => {
  if (!contacts || contacts.length === 0) {
    console.warn('⚠️ No emergency contacts configured to notify.');
    return { notified: [], failed: [] };
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚨 REAL-TIME SOS DISPATCH (TextBee Gateway)`);
  console.log(`   User: ${userName} | Emergency Contacts: ${contacts.length}`);
  console.log(`   Tracking Link: ${trackingLink}`);
  console.log('='.repeat(60));

  const results = await Promise.allSettled(
    contacts.map((c) => sendSOSAlert(c, trackingLink, userName, batteryPct))
  );

  const notified = [];
  const failed   = [];

  results.forEach((result, i) => {
    const contact = contacts[i];
    if (result.status === 'fulfilled' && result.value.success) {
      notified.push({ phone: result.value.phone, name: contact.name, batchId: result.value.batchId });
    } else {
      const val    = result.value || {};
      const reason = result.reason?.message || val.error || 'Failed to dispatch SMS';
      failed.push({ phone: contact.phone, name: contact.name, reason });
    }
  });

  console.log(`\n📊 DISPATCH RESULT: ✅ ${notified.length} queued | ❌ ${failed.length} failed`);
  if (failed.length > 0) {
    console.warn('   Failed list:', failed.map(f => `${f.name}: ${f.reason}`).join('; '));
  }
  console.log('='.repeat(60) + '\n');

  return { notified, failed };
};
