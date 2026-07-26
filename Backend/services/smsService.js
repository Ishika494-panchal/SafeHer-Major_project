const twilio = require('twilio');

// Lazy-initialized — the client is created on first use, not at module load.
// This means the server starts cleanly even when placeholder credentials are
// in .env; the error only surfaces when an SMS is actually attempted.
let _client = null;
function getClient() {
  if (!_client) _client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  return _client;
}

// Sends an SOS SMS to a single emergency contact.
// Does NOT throw on failure — one bad phone number must not block
// the other contacts from being messaged.
async function sendSOSAlert(contact, alertId, location) {
  // Tracking link uses the raw alertId as a placeholder.
  // The next task will replace this with a signed JWT so the link
  // grants time-limited, unauthenticated read access to the alert —
  // the contact receiving the SMS has no app account to authenticate with.
  const trackingUrl = `${process.env.FRONTEND_URL}/track/${alertId}`;

  const body =
    `🚨 SAFEHER ALERT: ${contact.name} has triggered an emergency SOS.\n` +
    `Location: ${location.latitude}, ${location.longitude}\n` +
    `Track here: ${trackingUrl}`;

  try {
    await getClient().messages.create({
      from: process.env.TWILIO_PHONE_NUMBER,
      to: contact.phone,
      body,
    });
    console.log(`SMS sent to ${contact.name} (${contact.phone})`);
  } catch (err) {
    // Log and swallow — caller uses Promise.allSettled so this won't
    // abort the other SMS sends or crash the trigger flow.
    console.error(`SMS failed for ${contact.name} (${contact.phone}):`, err.message);
  }
}

module.exports = { sendSOSAlert };
