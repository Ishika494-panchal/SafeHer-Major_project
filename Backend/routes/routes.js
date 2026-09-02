import express from 'express';
import { computeRoutesComparison } from '../services/routingService.js';

const router = express.Router();

// GET /routes/ - Computes and compares 3 route recommendations (Fastest, Shortest, Safest)
router.get('/', async (req, res) => {
  try {
    const originLat = parseFloat(req.query.origin_lat);
    const originLng = parseFloat(req.query.origin_lng);
    const destLat = parseFloat(req.query.dest_lat);
    const destLng = parseFloat(req.query.dest_lng);

    if (isNaN(originLat) || isNaN(originLng) || isNaN(destLat) || isNaN(destLng)) {
      return res.status(400).json({
        detail: 'origin_lat, origin_lng, dest_lat, and dest_lng are required query parameters (numbers)'
      });
    }

    const comparison = await computeRoutesComparison(originLat, originLng, destLat, destLng);
    return res.json(comparison);
  } catch (err) {
    console.error('Route calculation engine error:', err);
    return res.status(500).json({ detail: `Route calculation engine error: ${err.message}` });
  }
});

export default router;
