import axios from 'axios';

/**
 * OSRM Public Demo Server integration.
 *
 * NOTE: The public demo at router.project-osrm.org is rate-limited and is intended
 * for development/testing only. For production, self-host an OSRM instance:
 * https://github.com/Project-OSRM/osrm-backend
 */
const OSRM_BASE = 'http://router.project-osrm.org/route/v1/driving';
const REQUEST_TIMEOUT_MS = 10000;

/**
 * Fetch route alternatives from OSRM for a driving journey.
 *
 * @param {number} originLat
 * @param {number} originLng
 * @param {number} destLat
 * @param {number} destLng
 * @returns {Promise<Array<{ distance: number, duration: number, coordinates: [number,number][] }>>}
 *   Each item has:
 *   - distance: metres
 *   - duration: seconds
 *   - coordinates: array of [lng, lat] as returned by OSRM (GeoJSON order)
 */
export async function getRouteAlternatives(originLat, originLng, destLat, destLng) {
  const url =
    `${OSRM_BASE}/${originLng},${originLat};${destLng},${destLat}` +
    `?alternatives=true&overview=full&geometries=geojson`;

  let response;
  try {
    response = await axios.get(url, { timeout: REQUEST_TIMEOUT_MS });
  } catch (err) {
    const msg = err.code === 'ECONNABORTED'
      ? 'OSRM request timed out — the routing server may be slow. Try again.'
      : `OSRM unreachable: ${err.message}`;
    throw new Error(msg);
  }

  const { code, routes } = response.data;

  if (code !== 'Ok' || !routes || routes.length === 0) {
    throw new Error(`OSRM returned no routes (code: ${code}). Check that origin and destination are reachable by road.`);
  }

  return routes.map((r) => ({
    distance: r.distance,   // metres
    duration: r.duration,   // seconds
    coordinates: r.geometry.coordinates, // [[lng, lat], ...]
  }));
}
