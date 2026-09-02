import express from 'express';
import { query } from '../config/database.js';
import { recalculateDangerZones } from '../services/heatmapService.js';

const router = express.Router();

const getStatusTierAndColor = (riskScore) => {
  if (riskScore >= 7.0) {
    return { tier: 'danger', color: '#E11D48' }; // Crimson Pink / Red
  } else if (riskScore >= 4.0) {
    return { tier: 'warning', color: '#F59E0B' }; // Amber / Orange
  } else {
    return { tier: 'safe', color: '#10B981' }; // Mint Green
  }
};

// GET /heatmap/ - Returns GeoJSON FeatureCollection + danger_zones + heatmap_points for Leaflet map overlays
router.get('/', async (req, res) => {
  try {
    let zones = await query('SELECT * FROM danger_zones');

    // If no zones exist yet, run initial recalculation
    if (!zones || zones.length === 0) {
      zones = await recalculateDangerZones();
    }

    const approvedReports = await query("SELECT * FROM incident_reports WHERE status = 'approved'");

    const features = (zones || []).map((z) => {
      const { tier, color } = getStatusTierAndColor(z.risk_score);
      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [z.center_lng, z.center_lat]
        },
        properties: {
          id: z.id,
          risk_score: z.risk_score,
          report_count: z.report_count,
          status_tier: tier,
          color_code: color,
          radius_meters: z.radius_meters
        }
      };
    });

    const dangerZonesRes = (zones || []).map((z) => ({
      id: z.id,
      center_lat: z.center_lat,
      center_lng: z.center_lng,
      radius_meters: z.radius_meters,
      risk_score: z.risk_score,
      report_count: z.report_count,
      last_updated: z.last_updated
    }));

    const heatmapPoints = (approvedReports || []).map((r) => ({
      lat: r.latitude,
      lng: r.longitude,
      weight: 1.0
    }));

    return res.json({
      type: 'FeatureCollection',
      features,
      danger_zones: dangerZonesRes,
      heatmap_points: heatmapPoints
    });
  } catch (err) {
    console.error('Get heatmap error:', err);
    return res.status(500).json({ detail: err.message });
  }
});

// POST /heatmap/recalculate - Manually triggers DBSCAN clustering recalculation
router.post('/recalculate', async (req, res) => {
  try {
    const zones = await recalculateDangerZones();
    const response = zones.map((z) => ({
      id: z.id,
      center_lat: z.center_lat,
      center_lng: z.center_lng,
      radius_meters: z.radius_meters,
      risk_score: z.risk_score,
      report_count: z.report_count,
      last_updated: z.last_updated
    }));
    return res.json(response);
  } catch (err) {
    console.error('Recalculate heatmap error:', err);
    return res.status(500).json({ detail: err.message });
  }
});

export default router;
