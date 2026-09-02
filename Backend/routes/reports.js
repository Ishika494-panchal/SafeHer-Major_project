import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { query, get, run } from '../config/database.js';
import { recalculateDangerZones } from '../services/heatmapService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, '..', 'static', 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4().replace(/-/g, '')}${ext}`);
  }
});

const upload = multer({ storage });
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

const VALID_CATEGORIES = ['harassment', 'stalking', 'theft', 'unsafe_location'];
const VALID_STATUSES = ['pending', 'approved', 'rejected'];

// POST /reports/ - Submit an Anonymous Incident Report
router.post('/', upload.array('files', 10), async (req, res) => {
  try {
    const { category, description } = req.body;
    const lat = parseFloat(req.body.lat || req.body.latitude);
    const lng = parseFloat(req.body.lng || req.body.longitude);

    if (!category || isNaN(lat) || isNaN(lng) || !description) {
      return res.status(400).json({ detail: 'category, lat, lng, and description are required' });
    }

    const catLower = category.toLowerCase().trim();
    if (!VALID_CATEGORIES.includes(catLower)) {
      return res.status(400).json({
        detail: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`
      });
    }

    const mediaUrls = (req.files || []).map((file) => `/static/uploads/${file.filename}`);

    const reportId = uuidv4();
    const now = new Date().toISOString();

    await run(
      `INSERT INTO incident_reports (id, category, latitude, longitude, description, media_urls, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [reportId, catLower, lat, lng, description, JSON.stringify(mediaUrls), now]
    );

    const created = await get('SELECT * FROM incident_reports WHERE id = ?', [reportId]);

    return res.status(201).json({
      id: created.id,
      category: created.category,
      latitude: created.latitude,
      longitude: created.longitude,
      description: created.description,
      media_urls: parseMediaUrls(created.media_urls),
      status: created.status,
      created_at: created.created_at
    });
  } catch (err) {
    console.error('Submit report error:', err);
    return res.status(500).json({ detail: err.message });
  }
});

// GET /reports/ - List incident reports with optional status filter
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

// PATCH /reports/:report_id/moderate - Approve or Reject an incident report
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

    // Automatically recalculate danger zones when report moderation changes
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

export default router;
