import express from 'express';
import { query } from '../config/database.js';
import { computeRoutesComparison } from '../services/routingService.js';
import { getRouteAlternatives } from '../services/osrmService.js';
import { getRiskScoreForRoute, normalizeRiskScores } from '../services/riskScoringService.js';

const router = express.Router();

// ─── Helpers ────────────────────────────────────────────────────────────────

const round2 = (n) => Math.round(n * 100) / 100;
const round1 = (n) => Math.round(n * 10) / 10;

/**
 * Convert OSRM [lng, lat] coordinates to Leaflet [lat, lng] for direct map rendering.
 */
const toLeafletCoords = (osrmCoords) => osrmCoords.map(([lng, lat]) => [lat, lng]);

// ─── GET /routes/ ─────────────────────────────────────────────────────────
// Legacy endpoint: uses the custom Dijkstra grid graph (kept for compatibility)
router.get('/', async (req, res) => {
  try {
    const originLat = parseFloat(req.query.origin_lat);
    const originLng = parseFloat(req.query.origin_lng);
    const destLat   = parseFloat(req.query.dest_lat);
    const destLng   = parseFloat(req.query.dest_lng);

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

// ─── GET /routes/safe-navigation ─────────────────────────────────────────
// New endpoint: uses OSRM for real road geometry + risk scoring on top
router.get('/safe-navigation', async (req, res) => {
  try {
    const originLat = parseFloat(req.query.originLat ?? req.query.origin_lat);
    const originLng = parseFloat(req.query.originLng ?? req.query.origin_lng);
    const destLat   = parseFloat(req.query.destLat   ?? req.query.dest_lat);
    const destLng   = parseFloat(req.query.destLng   ?? req.query.dest_lng);

    if (
      isNaN(originLat) || isNaN(originLng) || isNaN(destLat) || isNaN(destLng) ||
      originLat < -90 || originLat > 90 || destLat < -90 || destLat > 90 ||
      originLng < -180 || originLng > 180 || destLng < -180 || destLng > 180
    ) {
      return res.status(400).json({
        detail: 'originLat, originLng, destLat, destLng are all required and must be valid coordinates.'
      });
    }

    // 1. Fetch all approved incident reports for risk scoring
    const incidentReports = await query(
      "SELECT latitude, longitude, category, created_at FROM incident_reports WHERE status = 'approved'"
    );

    // 2. Get route candidates from OSRM (1–3 alternatives)
    const candidates = await getRouteAlternatives(originLat, originLng, destLat, destLng);

    // 3. Score each candidate
    const rawScores = candidates.map((c) => getRiskScoreForRoute(c.coordinates, incidentReports));
    const normalizedScores = normalizeRiskScores(rawScores);

    const scored = candidates.map((c, i) => ({
      distanceKm:  round2(c.distance / 1000),
      durationMin: round1(c.duration / 60),
      riskScore:   normalizedScores[i],
      geometry:    toLeafletCoords(c.coordinates), // [lat, lng] for Leaflet
    }));

    // 4. Label routes — shortest=min distance, fastest=min duration, safest=min risk
    const byDistance = [...scored].sort((a, b) => a.distanceKm - b.distanceKm);
    const byDuration = [...scored].sort((a, b) => a.durationMin - b.durationMin);
    const byRisk     = [...scored].sort((a, b) => a.riskScore  - b.riskScore);

    const shortest = byDistance[0];
    const fastest  = byDuration[0];
    const safest   = byRisk[0];

    // Build notes when two labels resolve to the same physical route
    const notes = [];
    if (scored.length === 1) {
      notes.push('Only one route was available between these two points. All labels refer to the same route.');
    } else {
      if (fastest === shortest) notes.push('Fastest and Shortest are the same route in this area.');
      if (safest  === fastest)  notes.push('Safest and Fastest share the same corridor.');
      if (safest  === shortest) notes.push('Safest and Shortest share the same corridor.');
    }

    return res.json({
      routes: { fastest, shortest, safest },
      note: notes.length > 0 ? notes.join(' ') : null,
    });

  } catch (err) {
    console.error('Safe navigation error:', err);
    return res.status(500).json({ detail: err.message });
  }
});

export default router;
