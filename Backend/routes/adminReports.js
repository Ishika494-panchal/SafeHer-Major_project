import express from 'express';
import { query, get, run } from '../config/database.js';
import { recalculateDangerZones } from '../services/heatmapService.js';

const router = express.Router();

// ─── Admin Email Allowlist ────────────────────────────────────────────────
// Reads ADMIN_EMAILS from .env as a comma-separated list.
// Example: ADMIN_EMAILS=admin@safeher.com,ishika@example.com
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

/**
 * requireAdmin middleware
 * Checks if req.user exists (from auth middleware) and if the user's email
 * is in the admin allowlist. Falls back to allowing access if no admin emails
 * are configured (development mode).
 */
export function requireAdmin(req, res, next) {
  // In development — if no admin emails configured, allow all authenticated users
  if (ADMIN_EMAILS.length === 0) {
    return next();
  }

  if (!req.user || !req.user.email) {
    return res.status(401).json({ detail: 'Authentication required for admin access.' });
  }

  const userEmail = req.user.email.toLowerCase().trim();
  if (!ADMIN_EMAILS.includes(userEmail)) {
    return res.status(403).json({ detail: 'Forbidden — admin privileges required.' });
  }

  next();
}

const parseMediaUrls = (raw) => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

// GET /api/admin/reports — List reports for moderation review (admin only)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const statusFilter = (req.query.status || 'pending').toLowerCase().trim();
    const validStatuses = ['pending', 'approved', 'rejected', 'all'];

    if (!validStatuses.includes(statusFilter)) {
      return res.status(400).json({ detail: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    let reports;
    if (statusFilter === 'all') {
      reports = await query('SELECT * FROM incident_reports ORDER BY created_at DESC');
    } else {
      reports = await query(
        'SELECT * FROM incident_reports WHERE status = ? ORDER BY created_at DESC',
        [statusFilter]
      );
    }

    const response = (reports || []).map((r) => ({
      id: r.id,
      category: r.category,
      description: r.description,
      media_url: parseMediaUrls(r.media_urls)[0] || null,
      media_urls: parseMediaUrls(r.media_urls),
      latitude: r.latitude,
      longitude: r.longitude,
      status: r.status,
      created_at: r.created_at,
    }));

    return res.json(response);
  } catch (err) {
    console.error('Admin get reports error:', err);
    return res.status(500).json({ detail: err.message });
  }
});

// PUT /api/admin/reports/:id — Update report status (admin only)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ detail: "status is required ('approved' or 'rejected')" });
    }

    const newStatus = status.toLowerCase().trim();
    if (!['approved', 'rejected'].includes(newStatus)) {
      return res.status(400).json({ detail: "Invalid status value. Must be 'approved' or 'rejected'" });
    }

    const report = await get('SELECT * FROM incident_reports WHERE id = ?', [id]);
    if (!report) {
      return res.status(404).json({ detail: 'Incident report not found' });
    }

    await run('UPDATE incident_reports SET status = ? WHERE id = ?', [newStatus, id]);
    await recalculateDangerZones();

    const updated = await get('SELECT * FROM incident_reports WHERE id = ?', [id]);

    return res.json({
      id: updated.id,
      category: updated.category,
      description: updated.description,
      media_url: parseMediaUrls(updated.media_urls)[0] || null,
      media_urls: parseMediaUrls(updated.media_urls),
      latitude: updated.latitude,
      longitude: updated.longitude,
      status: updated.status,
      created_at: updated.created_at,
    });
  } catch (err) {
    console.error('Admin moderate report error:', err);
    return res.status(500).json({ detail: err.message });
  }
});

export default router;
