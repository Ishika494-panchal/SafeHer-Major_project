const pool = require('../db/pool');

const updateLocation = async (req, res) => {
  const { latitude, longitude } = req.body;
  const user_id = req.user.user_id;

  if (typeof latitude !== 'number' || !isFinite(latitude)) {
    return res.status(400).json({ error: 'latitude must be a finite number' });
  }
  if (typeof longitude !== 'number' || !isFinite(longitude)) {
    return res.status(400).json({ error: 'longitude must be a finite number' });
  }
  if (latitude < -90 || latitude > 90) {
    return res.status(400).json({ error: 'latitude must be between -90 and 90' });
  }
  if (longitude < -180 || longitude > 180) {
    return res.status(400).json({ error: 'longitude must be between -180 and 180' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO location_history (user_id, latitude, longitude)
       VALUES ($1, $2, $3)
       RETURNING id, latitude, longitude, recorded_at`,
      [user_id, latitude, longitude]
    );

    return res.status(201).json({
      message: 'Location recorded',
      location: result.rows[0],
    });
  } catch (err) {
    console.error('updateLocation error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const getLatestLocation = async (req, res) => {
  const user_id = req.user.user_id;

  try {
    const result = await pool.query(
      `SELECT id, latitude, longitude, recorded_at
       FROM   location_history
       WHERE  user_id = $1
       ORDER BY recorded_at DESC
       LIMIT 1`,
      [user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No location history found for this user' });
    }

    return res.status(200).json({ location: result.rows[0] });
  } catch (err) {
    console.error('getLatestLocation error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const getLiveLocationForTracking = async (req, res) => {
  const userId = req.tracking.userId;

  try {
    const result = await pool.query(
      `SELECT id, latitude, longitude, recorded_at
       FROM   location_history
       WHERE  user_id = $1
       ORDER BY recorded_at DESC
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No location history found for this user' });
    }

    return res.status(200).json({ location: result.rows[0] });
  } catch (err) {
    console.error('getLiveLocationForTracking error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const getSOSResponderLocation = async (req, res) => {
  const { alertId } = req.params;
  const userId = req.user.user_id;

  try {
    const alertResult = await pool.query(
      'SELECT id, user_id, responder_id, status FROM sos_alerts WHERE id = $1',
      [alertId]
    );

    if (alertResult.rows.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    const alert = alertResult.rows[0];

    if (alert.responder_id !== userId) {
      return res.status(403).json({ error: 'Access denied: You are not the assigned responder for this alert' });
    }

    const locationResult = await pool.query(
      `SELECT id, latitude, longitude, recorded_at
       FROM   location_history
       WHERE  user_id = $1
       ORDER BY recorded_at DESC
       LIMIT 1`,
      [alert.user_id]
    );

    if (locationResult.rows.length === 0) {
      return res.status(404).json({ error: 'No location history found for this user' });
    }

    return res.status(200).json({ location: locationResult.rows[0] });
  } catch (err) {
    console.error('getSOSResponderLocation error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  updateLocation,
  getLatestLocation,
  getLiveLocationForTracking,
  getSOSResponderLocation,
};
