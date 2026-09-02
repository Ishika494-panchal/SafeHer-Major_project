import { query, run, get } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

export const haversineDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371000.0; // Earth radius in meters
  const toRad = (x) => (x * Math.PI) / 180.0;

  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaPhi = toRad(lat2 - lat1);
  const deltaLambda = toRad(lng2 - lng1);

  const a =
    Math.sin(deltaPhi / 2.0) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2.0) ** 2;
  const c = 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(1.0 - a));
  return R * c;
};

export const CATEGORY_WEIGHTS = {
  stalking: 3.0,
  harassment: 2.5,
  theft: 1.5,
  unsafe_location: 1.0
};

export const calculateRecencyWeight = (createdAt) => {
  if (!createdAt) return 0.5;
  const created = new Date(createdAt);
  const now = new Date();
  const ageDays = (now - created) / (1000 * 60 * 60 * 24);

  if (ageDays <= 7) return 1.0;
  if (ageDays <= 30) return 0.8;
  if (ageDays <= 90) return 0.6;
  return 0.4;
};

export const recalculateDangerZones = async (epsMeters = 350.0) => {
  // 1. Fetch all approved reports
  const approvedReports = await query(
    "SELECT * FROM incident_reports WHERE status = 'approved' ORDER BY created_at DESC"
  );

  if (!approvedReports || approvedReports.length === 0) {
    await run('DELETE FROM danger_zones');
    return [];
  }

  // 2. DBSCAN spatial clustering
  const visited = new Array(approvedReports.length).fill(false);
  const clusters = [];

  for (let i = 0; i < approvedReports.length; i++) {
    if (visited[i]) continue;

    visited[i] = true;
    const cluster = [approvedReports[i]];
    const queue = [approvedReports[i]];

    while (queue.length > 0) {
      const curr = queue.shift();
      for (let j = 0; j < approvedReports.length; j++) {
        if (!visited[j]) {
          const dist = haversineDistance(
            curr.latitude,
            curr.longitude,
            approvedReports[j].latitude,
            approvedReports[j].longitude
          );
          if (dist <= epsMeters) {
            visited[j] = true;
            cluster.push(approvedReports[j]);
            queue.push(approvedReports[j]);
          }
        }
      }
    }

    clusters.push(cluster);
  }

  // 3. Clear old zones
  await run('DELETE FROM danger_zones');

  const newDangerZones = [];
  const now = new Date().toISOString();

  for (const cluster of clusters) {
    const centerLat = cluster.reduce((sum, r) => sum + r.latitude, 0) / cluster.length;
    const centerLng = cluster.reduce((sum, r) => sum + r.longitude, 0) / cluster.length;

    let maxDist = 0;
    for (const r of cluster) {
      const dist = haversineDistance(centerLat, centerLng, r.latitude, r.longitude);
      if (dist > maxDist) maxDist = dist;
    }
    const radiusMeters = Math.max(250.0, maxDist + 50.0);

    let totalWeightedSeverity = 0.0;
    for (const r of cluster) {
      const catKey = (r.category || '').toLowerCase();
      const weight = CATEGORY_WEIGHTS[catKey] || 1.5;
      const recency = calculateRecencyWeight(r.created_at);
      totalWeightedSeverity += weight * recency;
    }

    const rawScore = 2.0 + totalWeightedSeverity * 1.5;
    const riskScore = Math.round(Math.min(10.0, Math.max(1.0, rawScore)) * 10) / 10;

    const zoneId = uuidv4();
    await run(
      `INSERT INTO danger_zones (id, center_lat, center_lng, radius_meters, risk_score, report_count, last_updated)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        zoneId,
        Math.round(centerLat * 1e6) / 1e6,
        Math.round(centerLng * 1e6) / 1e6,
        Math.round(radiusMeters * 10) / 10,
        riskScore,
        cluster.length,
        now
      ]
    );

    const savedZone = await get('SELECT * FROM danger_zones WHERE id = ?', [zoneId]);
    newDangerZones.push(savedZone);
  }

  return newDangerZones;
};
