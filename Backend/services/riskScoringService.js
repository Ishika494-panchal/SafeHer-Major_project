import { haversineDistance, CATEGORY_WEIGHTS } from './heatmapService.js';

const INCIDENT_RADIUS_METERS = 300;

// Reports in the last 30 days count double; older reports count once.
const RECENCY_THRESHOLD_DAYS = 30;
const RECENCY_MULTIPLIER = 2.0;

/**
 * Score a route against a set of approved incident reports.
 *
 * @param {Array<[number, number]>} routeCoordinates - [[lng, lat], ...] as returned by OSRM
 * @param {Array<Object>} incidentReports - Rows from incident_reports (must have latitude, longitude, category, created_at)
 * @returns {number} Raw risk score (unbounded; normalize across candidates before displaying)
 */
export function getRiskScoreForRoute(routeCoordinates, incidentReports) {
  if (!routeCoordinates || routeCoordinates.length === 0) return 0;
  if (!incidentReports || incidentReports.length === 0) return 0;

  const now = Date.now();
  const thirtyDaysMs = RECENCY_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;

  let totalRisk = 0;

  for (const [lng, lat] of routeCoordinates) {
    for (const report of incidentReports) {
      const dist = haversineDistance(lat, lng, report.latitude, report.longitude);
      if (dist > INCIDENT_RADIUS_METERS) continue;

      // Severity weight by category
      const catKey = (report.category || '').toLowerCase();
      const severityWeight = CATEGORY_WEIGHTS[catKey] ?? 1.0;

      // Recency weight: recent reports count RECENCY_MULTIPLIER×
      const reportAgeMs = now - new Date(report.created_at).getTime();
      const recencyWeight = reportAgeMs <= thirtyDaysMs ? RECENCY_MULTIPLIER : 1.0;

      // Proximity decay: closer incidents contribute more
      const proximityFactor = 1 - dist / INCIDENT_RADIUS_METERS;

      totalRisk += severityWeight * recencyWeight * proximityFactor;
    }
  }

  return totalRisk;
}

/**
 * Normalise a set of raw risk scores to a 0–100 scale.
 * If all routes have the same score (or only 1 route), scores map to 50.
 *
 * @param {number[]} rawScores
 * @returns {number[]} Normalised scores 0–100 (rounded to 1 dp)
 */
export function normalizeRiskScores(rawScores) {
  const min = Math.min(...rawScores);
  const max = Math.max(...rawScores);

  if (max === min) {
    // All routes equally risky — return mid-scale
    return rawScores.map(() => 50.0);
  }

  return rawScores.map((s) => Math.round(((s - min) / (max - min)) * 100 * 10) / 10);
}
