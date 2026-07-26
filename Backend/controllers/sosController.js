const pool = require('../db/pool');
const { getIO } = require('../sockets');
const { sendSOSAlert } = require('../services/smsService');
const { generateTrackingToken } = require('../services/trackingTokenService');

function validateCoords(latitude, longitude) {
  if (typeof latitude !== 'number' || !isFinite(latitude) || latitude < -90 || latitude > 90) {
    return 'latitude must be a finite number between -90 and 90';
  }
  if (typeof longitude !== 'number' || !isFinite(longitude) || longitude < -180 || longitude > 180) {
    return 'longitude must be a finite number between -180 and 180';
  }
  return null;
}

const triggerSOS = async (req, res) => {
  const user_id = req.user.user_id;
  let { latitude, longitude } = req.body;

  try {
    if (latitude === undefined || longitude === undefined) {
      const locResult = await pool.query(
        `SELECT latitude, longitude
         FROM   location_history
         WHERE  user_id = $1
         ORDER BY recorded_at DESC
         LIMIT 1`,
        [user_id]
      );

      if (locResult.rows.length === 0) {
        return res.status(400).json({
          error: 'No coordinates provided and no location history found. Please send latitude and longitude.',
        });
      }

      latitude  = locResult.rows[0].latitude;
      longitude = locResult.rows[0].longitude;
    }

    const coordError = validateCoords(latitude, longitude);
    if (coordError) return res.status(400).json({ error: coordError });

    const result = await pool.query(
      `INSERT INTO sos_alerts (user_id, latitude, longitude, status)
       VALUES ($1, $2, $3, 'active')
       RETURNING id, latitude, longitude, status, created_at`,
      [user_id, latitude, longitude]
    );

    const alert = result.rows[0];

    // Notify all connected volunteers in real time.
    getIO().to('volunteers').emit('new-alert', {
      id: alert.id,
      latitude: alert.latitude,
      longitude: alert.longitude,
      created_at: alert.created_at,
    });

    // Fetch emergency contacts and send SMS to each one.
    const contactsResult = await pool.query(
      'SELECT name, phone FROM emergency_contacts WHERE user_id = $1',
      [user_id]
    );

    // Promise.allSettled instead of Promise.all:
    // Promise.all short-circuits on the first rejection — if one Twilio call
    // fails, every remaining SMS would be silently skipped.
    // Promise.allSettled waits for every promise to finish (fulfilled or rejected)
    // so all contacts are attempted regardless of individual failures.
    const trackingToken = generateTrackingToken(alert.id, user_id);

    await Promise.allSettled(
      contactsResult.rows.map((contact) =>
        sendSOSAlert(contact, trackingToken, { latitude, longitude })
      )
    );

    return res.status(201).json({
      message: 'SOS alert triggered',
      alert,
    });
  } catch (err) {
    console.error('triggerSOS error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const acceptAlert = async (req, res) => {
  const { alertId } = req.params;
  const volunteer_id = req.user.user_id;

  if (req.user.role !== 'volunteer') {
    return res.status(403).json({ error: 'Only volunteers can accept SOS alerts' });
  }

  try {
    const fetch = await pool.query(
      'SELECT id, status, responder_id FROM sos_alerts WHERE id = $1',
      [alertId]
    );

    if (fetch.rows.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    const alert = fetch.rows[0];

    if (alert.status !== 'active') {
      return res.status(409).json({
        error: `Alert is already '${alert.status}' and cannot be accepted`,
      });
    }

    const result = await pool.query(
      `UPDATE sos_alerts
       SET    responder_id = $1,
              status       = 'responded'
       WHERE  id = $2
       RETURNING id, user_id, responder_id, status, latitude, longitude, created_at`,
      [volunteer_id, alertId]
    );

    const updated = result.rows[0];

    // Fetch volunteer's name and phone to include in the notification.
    const volunteerResult = await pool.query(
      'SELECT name, phone FROM users WHERE id = $1',
      [volunteer_id]
    );
    const volunteer = volunteerResult.rows[0];

    // Emit privately to the woman who triggered the alert — she gets
    // a direct notification that a specific volunteer is on the way.
    getIO().to(`user:${updated.user_id}`).emit('alert-accepted', {
      alertId: updated.id,
      responder: {
        name: volunteer.name,
        phone: volunteer.phone,
      },
    });

    return res.status(200).json({
      message: 'Alert accepted',
      alert: updated,
    });
  } catch (err) {
    console.error('acceptAlert error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const resolveAlert = async (req, res) => {
  const { alertId } = req.params;
  const user_id = req.user.user_id;

  try {
    const fetch = await pool.query(
      'SELECT id, user_id, status FROM sos_alerts WHERE id = $1',
      [alertId]
    );

    if (fetch.rows.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    const alert = fetch.rows[0];

    if (alert.user_id !== user_id) {
      return res.status(403).json({ error: 'Only the alert owner can resolve this alert' });
    }

    if (alert.status === 'resolved') {
      return res.status(409).json({ error: 'Alert is already resolved' });
    }

    const result = await pool.query(
      `UPDATE sos_alerts
       SET    status      = 'resolved',
              resolved_at = NOW()
       WHERE  id = $1
       RETURNING id, user_id, responder_id, status, latitude, longitude, created_at, resolved_at`,
      [alertId]
    );

    const updated = result.rows[0];

    // Notify all volunteers so they remove this alert from their active list.
    getIO().to('volunteers').emit('alert-resolved', {
      alertId: updated.id,
    });

    return res.status(200).json({
      message: 'Alert resolved',
      alert: updated,
    });
  } catch (err) {
    console.error('resolveAlert error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const getActiveAlerts = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, user_id, latitude, longitude, status, created_at
       FROM   sos_alerts
       WHERE  status = 'active'
       ORDER BY created_at ASC`
    );

    return res.status(200).json({
      count: result.rows.length,
      alerts: result.rows,
    });
  } catch (err) {
    console.error('getActiveAlerts error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { triggerSOS, acceptAlert, resolveAlert, getActiveAlerts };
