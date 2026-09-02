import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { query, get, run } from '../config/database.js';
import { recalculateDangerZones } from '../services/heatmapService.js';
import { uploadFile } from '../services/uploadService.js';

const VALID_CATEGORIES = ['harassment', 'stalking', 'theft', 'unsafe_location'];
const VALID_STATUSES = ['pending', 'approved', 'rejected'];
const ALLOWED_MIMETYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// Use memory storage so buffers are available for S3 upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMETYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type "${file.mimetype}". Accepted: JPEG, PNG, WebP.`), false);
    }
  },
});

const router = express.Router();

const parseMediaUrls = (raw) => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

// POST /reports/ — Submit an Anonymous Incident Report (PUBLIC, no auth required)
router.post('/', upload.array('files', 10), async (req, res) => {
  try {
    const { category, description } = req.body;
    const lat = parseFloat(req.body.lat || req.body.latitude);
    const lng = parseFloat(req.body.lng || req.body.longitude);

    if (!category || isNaN(lat) || isNaN(lng) || !description) {
      return res.status(400).json({ detail: 'category, lat, lng, and description are required' });
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ detail: 'lat must be -90..90, lng must be -180..180' });
    }

    const catLower = category.toLowerCase().trim();
    if (!VALID_CATEGORIES.includes(catLower)) {
      return res.status(400).json({
        detail: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`
      });
    }

    // Upload each file (to S3 or local disk depending on config)
    const mediaUrls = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const url = await uploadFile(file.buffer, file.mimetype);
        mediaUrls.push(url);
      }
    }

    const reportId = uuidv4();
    const now = new Date().toISOString();

    await run(
      `INSERT INTO incident_reports (id, category, latitude, longitude, description, media_urls, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [reportId, catLower, lat, lng, description, JSON.stringify(mediaUrls), now]
    );

    return res.status(201).json({ success: true, reportId });
  } catch (err) {
    console.error('Submit report error:', err);
    return res.status(500).json({ detail: err.message });
  }
});

// GET /reports/heatmap — Public heatmap data endpoint
router.get('/heatmap', async (_req, res) => {
  try {
    const rows = await query("SELECT latitude AS lat, longitude AS lng FROM incident_reports WHERE status = 'approved'");
    const points = (rows || []).map((r) => ({ lat: r.lat, lng: r.lng, weight: 1 }));
    return res.json(points);
  } catch (err) {
    console.error('Get heatmap points error:', err);
    return res.status(500).json({ detail: err.message });
  }
});

// GET /reports/ — List incident reports with optional status filter (used by admin panel)
router.get('/', async (req, res) => {
  try {
    const statusFilter = (req.query.status_filter || req.query.status || 'all').toLowerCase().trim();

    let reports;
    if (statusFilter !== 'all' && VALID_STATUSES.includes(statusFilter)) {
      reports = await query(
        'SELECT * FROM incident_reports WHERE status = ? ORDER BY created_at DESC',
        [statusFilter]
      );
    } else {
      reports = await query('SELECT * FROM incident_reports ORDER BY created_at DESC');
    }

    const response = (reports || []).map((r) => ({
      id: r.id,
      category: r.category,
      latitude: r.latitude,
      longitude: r.longitude,
      description: r.description,
      media_urls: parseMediaUrls(r.media_urls),
      status: r.status,
      created_at: r.created_at
    }));

    return res.json(response);
  } catch (err) {
    console.error('Get reports error:', err);
    return res.status(500).json({ detail: err.message });
  }
});

// PATCH /reports/:report_id/moderate — Approve or Reject an incident report
router.patch('/:report_id/moderate', async (req, res) => {
  try {
    const { report_id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ detail: "status is required ('approved' or 'rejected')" });
    }

    const newStatus = status.toLowerCase().trim();
    if (!['approved', 'rejected'].includes(newStatus)) {
      return res.status(400).json({ detail: "Invalid status value. Must be 'approved' or 'rejected'" });
    }

    const report = await get('SELECT * FROM incident_reports WHERE id = ?', [report_id]);
    if (!report) {
      return res.status(404).json({ detail: 'Incident report not found' });
    }

    await run('UPDATE incident_reports SET status = ? WHERE id = ?', [newStatus, report_id]);
    await recalculateDangerZones();

    const updated = await get('SELECT * FROM incident_reports WHERE id = ?', [report_id]);

    return res.json({
      id: updated.id,
      category: updated.category,
      latitude: updated.latitude,
      longitude: updated.longitude,
      description: updated.description,
      media_urls: parseMediaUrls(updated.media_urls),
      status: updated.status,
      created_at: updated.created_at
    });
  } catch (err) {
    console.error('Moderate report error:', err);
    return res.status(500).json({ detail: err.message });
  }
});

// PUT /reports/:report_id — Alternative verb for moderation (spec-compliant)
router.put('/:report_id', async (req, res) => {
  try {
    const { report_id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ detail: "status is required ('approved' or 'rejected')" });
    }

    const newStatus = status.toLowerCase().trim();
    if (!['approved', 'rejected'].includes(newStatus)) {
      return res.status(400).json({ detail: "Invalid status value. Must be 'approved' or 'rejected'" });
    }

    const report = await get('SELECT * FROM incident_reports WHERE id = ?', [report_id]);
    if (!report) {
      return res.status(404).json({ detail: 'Incident report not found' });
    }

    await run('UPDATE incident_reports SET status = ? WHERE id = ?', [newStatus, report_id]);
    await recalculateDangerZones();

    const updated = await get('SELECT * FROM incident_reports WHERE id = ?', [report_id]);

    return res.json({
      id: updated.id,
      category: updated.category,
      latitude: updated.latitude,
      longitude: updated.longitude,
      description: updated.description,
      media_urls: parseMediaUrls(updated.media_urls),
      status: updated.status,
      created_at: updated.created_at
    });
  } catch (err) {
    console.error('Moderate report (PUT) error:', err);
    return res.status(500).json({ detail: err.message });
  }
});

// Handle multer file validation errors gracefully
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ detail: 'File too large. Maximum size is 5MB.' });
    }
    return res.status(400).json({ detail: err.message });
  }
  if (err && err.message && err.message.includes('Invalid file type')) {
    return res.status(400).json({ detail: err.message });
  }
  next(err);
});

export default router;
