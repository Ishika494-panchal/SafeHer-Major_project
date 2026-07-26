const pool = require('../db/pool');
const { verifyTrackingToken } = require('../services/trackingTokenService');

const trackingAuthMiddleware = async (req, res, next) => {
  const { token } = req.params;

  if (!token) {
    return res.status(401).json({ error: 'Tracking token missing' });
  }

  try {
    const decoded = verifyTrackingToken(token);

    const result = await pool.query(
      'SELECT id, status FROM sos_alerts WHERE id = $1',
      [decoded.alertId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    const alert = result.rows[0];

    if (alert.status === 'resolved') {
      return res.status(410).json({ error: 'SOS alert has been resolved' });
    }

    req.tracking = {
      alertId: decoded.alertId,
      userId: decoded.userId,
    };

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired tracking token' });
  }
};

module.exports = trackingAuthMiddleware;
