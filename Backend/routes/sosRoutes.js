const express = require('express');
const router = express.Router();

const { verifyToken } = require('../middleware/authMiddleware');
const {
  triggerSOS,
  acceptAlert,
  resolveAlert,
  getActiveAlerts,
} = require('../controllers/sosController');

router.post('/trigger', verifyToken, triggerSOS);
router.patch('/:alertId/accept', verifyToken, acceptAlert);
router.patch('/:alertId/resolve', verifyToken, resolveAlert);
router.get('/active', verifyToken, getActiveAlerts);

module.exports = router;
