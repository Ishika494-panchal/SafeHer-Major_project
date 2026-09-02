/**
 * routes/sos.js — SafeHer Emergency Distress & Live Tracking Router
 *
 * Endpoints:
 *   POST   /sos/trigger           — Authenticated: Trigger SOS distress alert and notify emergency contacts
 *   POST   /sos/:alertId/location — Authenticated: Push live GPS coordinate ping
 *   POST   /sos/:alertId/cancel   — Authenticated: Cancel and resolve active SOS distress signal
 *   GET    /sos/:alertId/status   — Authenticated: Retrieve SOS status, user details, and location history
 *   GET    /sos/track/:token      — Public: Live location tracking map for guardians/emergency services
 */

import express from 'express';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { query, get, run } from '../config/database.js';
import { requireAuth } from '../middleware/auth.js';
import { notifyAllContacts } from '../services/smsService.js';

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC ROUTE — must be registered BEFORE /:alertId routes so Express does
// not try to parse "track" as an alertId param.
// GET /sos/track/:token
// ─────────────────────────────────────────────────────────────────────────────
router.get('/track/:token', async (req, res) => {
  try {
    const { token } = req.params;

    // Look up the alert by tracking_token
    const alert = await get(
      'SELECT * FROM sos_alerts WHERE tracking_token = ?',
      [token]
    );

    if (!alert) {
      return res.status(404).json({ detail: 'Tracking link not found or expired.' });
    }

    // Fetch most recent location ping for this alert
    const latestLocation = await get(
      `SELECT lat, lng, battery_pct, timestamp AS recorded_at
         FROM live_locations
        WHERE alert_id = ?
        ORDER BY timestamp DESC
        LIMIT 1`,
      [alert.id]
    );

    // Fetch user info (name only — no PII leak)
    const user = await get('SELECT name FROM users WHERE id = ?', [alert.user_id]);

    const isActive = alert.status === 'active';

    return res.json({
      alertId:         alert.id,
      userName:        user?.name ?? 'SafeHer User',
      status:          alert.status,
      isActive,
      triggeredAt:     alert.triggered_at,
      endedAt:         alert.ended_at ?? null,
      latestLocation:  latestLocation ?? null   // null if no location pings yet
    });
  } catch (err) {
    console.error('Track lookup error:', err);
    return res.status(500).json({ detail: err.message });
  }
});

// POST /sos/trigger — Trigger an Emergency SOS Alert and notify guardians
router.post('/trigger', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const { latitude, longitude, battery_percent } = req.body;

    const lat     = typeof latitude       === 'number' ? latitude       : 0.0;
    const lng     = typeof longitude      === 'number' ? longitude      : 0.0;
    const battery = typeof battery_percent === 'number' ? battery_percent : 100;

    const trackingToken = crypto.randomBytes(16).toString('hex');
    const alertId = uuidv4();
    const now     = new Date().toISOString();

    // 1. Record distress alert
    await run(
      `INSERT INTO sos_alerts
         (id, user_id, latitude, longitude, battery_percent, status, tracking_token, triggered_at)
       VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`,
      [alertId, user.id, lat, lng, battery, trackingToken, now]
    );

    // 2. Log initial GPS ping
    await run(
      `INSERT INTO live_locations (id, alert_id, lat, lng, battery_pct, timestamp)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [uuidv4(), alertId, lat, lng, battery, now]
    );

    // 3. Build live tracking link
    const frontendUrl  = process.env.FRONTEND_URL || 'http://localhost:3000';
    const trackingLink = `${frontendUrl}/track/${trackingToken}`;

    // 4. Fetch emergency contacts
    const contacts = await query(
      'SELECT * FROM emergency_contacts WHERE user_id = ?',
      [user.id]
    );

    // 5. Dispatch SMS notifications
    const { notified, failed } = await notifyAllContacts(contacts, trackingLink, user.name, battery);

    console.log(`🚨 SOS triggered by ${user.name} | Alert ${alertId} | Token: ${trackingToken}`);
    console.log(`   📲 Notified: ${notified.length} | Failed: ${failed.length}`);

    return res.status(201).json({
      alertId,
      trackingToken,
      trackingLink,
      status:           'active',
      triggeredAt:      now,
      contactsNotified: notified.length,
      contactsFailed:   failed.length,
      failedDetails:    failed   // empty array if all succeeded
    });
  } catch (err) {
    console.error('Trigger SOS error:', err);
    return res.status(500).json({ detail: `Failed to trigger SOS: ${err.message}` });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /sos/:alertId/location — Push a live GPS location ping
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:alertId/location', requireAuth, async (req, res) => {
  try {
    const { alertId } = req.params;
    const { lat, lng, batteryPct } = req.body;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ detail: 'lat and lng are required' });
    }

    // Verify alert exists AND belongs to the authenticated user
    const alert = await get(
      'SELECT * FROM sos_alerts WHERE id = ? AND user_id = ?',
      [alertId, req.user.id]
    );

    if (!alert) {
      return res.status(404).json({ detail: 'SOS alert not found or does not belong to you.' });
    }

    if (alert.status !== 'active') {
      return res.status(403).json({
        detail: `Cannot push location — alert status is '${alert.status}', not 'active'.`
      });
    }

    const pingId  = uuidv4();
    const now     = new Date().toISOString();
    const battery = batteryPct !== undefined ? batteryPct : 100;

    await run(
      `INSERT INTO live_locations (id, alert_id, lat, lng, battery_pct, timestamp)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [pingId, alertId, lat, lng, battery, now]
    );

    return res.json({ id: pingId, alertId, lat, lng, batteryPct: battery, recordedAt: now });
  } catch (err) {
    console.error('Push location error:', err);
    return res.status(500).json({ detail: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /sos/:alertId/cancel — Cancel / resolve an active alert
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:alertId/cancel', requireAuth, async (req, res) => {
  try {
    const { alertId } = req.params;

    // Verify ownership
    const alert = await get(
      'SELECT * FROM sos_alerts WHERE id = ? AND user_id = ?',
      [alertId, req.user.id]
    );

    if (!alert) {
      return res.status(404).json({ detail: 'SOS alert not found or does not belong to you.' });
    }

    const now = new Date().toISOString();

    await run(
      `UPDATE sos_alerts SET status = 'cancelled', ended_at = ? WHERE id = ?`,
      [now, alertId]
    );

    return res.json({
      alertId,
      status:      'cancelled',
      triggeredAt: alert.triggered_at,
      endedAt:     now
    });
  } catch (err) {
    console.error('Cancel SOS error:', err);
    return res.status(500).json({ detail: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /sos/:alertId/status — Poll full alert status + location history
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:alertId/status', requireAuth, async (req, res) => {
  try {
    const { alertId } = req.params;

    const alert = await get('SELECT * FROM sos_alerts WHERE id = ?', [alertId]);
    if (!alert) {
      return res.status(404).json({ detail: 'SOS Alert not found' });
    }

    const user = await get('SELECT * FROM users WHERE id = ?', [alert.user_id]);

    const locations = await query(
      'SELECT * FROM live_locations WHERE alert_id = ? ORDER BY timestamp DESC',
      [alertId]
    );

    const latestLocation = locations?.length > 0 ? locations[0] : null;

    return res.json({
      alertId:         alert.id,
      userId:          alert.user_id,
      userName:        user?.name  ?? 'SafeHer User',
      userPhone:       user?.phone ?? null,
      status:          alert.status,
      isActive:        alert.status === 'active',
      trackingToken:   alert.tracking_token,
      triggeredAt:     alert.triggered_at,
      endedAt:         alert.ended_at   ?? null,
      latestLocation,
      locationHistory: locations ?? []
    });
  } catch (err) {
    console.error('Get SOS status error:', err);
    return res.status(500).json({ detail: err.message });
  }
});

export default router;
