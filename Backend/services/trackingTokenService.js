const jwt = require('jsonwebtoken');

// The purpose field prevents a standard user login JWT from being used to access
// tracking endpoints. Since all JWTs in the app are signed with process.env.JWT_SECRET,
// explicitly requiring purpose === 'track' ensures only tokens specifically generated
// for emergency tracking links are accepted.
const generateTrackingToken = (alertId, userId) => {
  return jwt.sign(
    { alertId, userId, purpose: 'track' },
    process.env.JWT_SECRET,
    { expiresIn: '6h' }
  );
};

const verifyTrackingToken = (token) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  if (decoded.purpose !== 'track') {
    throw new Error('Invalid tracking token purpose');
  }
  return decoded;
};

module.exports = { generateTrackingToken, verifyTrackingToken };
