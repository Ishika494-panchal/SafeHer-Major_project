const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const trackingAuthMiddleware = require('../middleware/trackingAuthMiddleware');
const {
  updateLocation,
  getLatestLocation,
  getLiveLocationForTracking,
  getSOSResponderLocation,
} = require('../controllers/locationController');

router.post('/', verifyToken, updateLocation);
router.get('/latest', verifyToken, getLatestLocation);
router.get('/track/:token', trackingAuthMiddleware, getLiveLocationForTracking);
router.get('/sos/:alertId', verifyToken, getSOSResponderLocation);

module.exports = router;
