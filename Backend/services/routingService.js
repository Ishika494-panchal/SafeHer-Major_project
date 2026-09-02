import { query } from '../config/database.js';
import { haversineDistance } from './heatmapService.js';

const WALKING_SPEED_MPS = 1.35; // ~4.86 km/h walking speed

export const buildLocalRoadGraph = (centerLat, centerLng, gridSize = 9, stepDeg = 0.003) => {
  const nodes = {};
  const edges = [];
  const adjacency = {};

  const half = Math.floor(gridSize / 2);

  for (let i = -half; i <= half; i++) {
    for (let j = -half; j <= half; j++) {
      const lat = Math.round((centerLat + i * stepDeg) * 1e6) / 1e6;
      const lng = Math.round((centerLng + j * stepDeg) * 1e6) / 1e6;
      const nodeId = `node_${i}_${j}`;
      nodes[nodeId] = { id: nodeId, lat, lng, i, j };
      adjacency[nodeId] = [];
    }
  }

  const addEdge = (uId, vId) => {
    if (!nodes[uId] || !nodes[vId]) return;
    const u = nodes[uId];
    const v = nodes[vId];
    const dist = haversineDistance(u.lat, u.lng, v.lat, v.lng);
    const edgeObj = {
      u: uId,
      v: vId,
      length: dist,
      riskPenalty: 0.0
    };
    edges.push(edgeObj);
    adjacency[uId].push({ target: vId, edge: edgeObj });
    adjacency[vId].push({ target: uId, edge: edgeObj });
  };

  for (let i = -half; i <= half; i++) {
    for (let j = -half; j <= half; j++) {
      const uId = `node_${i}_${j}`;
      // Connect right neighbor
      if (j + 1 <= half) addEdge(uId, `node_${i}_${j + 1}`);
      // Connect bottom neighbor
      if (i + 1 <= half) addEdge(uId, `node_${i + 1}_${j}`);
      // Connect diagonal neighbor for realistic street routing
      if (i + 1 <= half && j + 1 <= half) addEdge(uId, `node_${i + 1}_${j + 1}`);
    }
  }

  return { nodes, edges, adjacency };
};

export const findNearestNode = (graph, lat, lng) => {
  let bestNode = null;
  let minDist = Infinity;

  for (const nodeId in graph.nodes) {
    const node = graph.nodes[nodeId];
    const dist = haversineDistance(lat, lng, node.lat, node.lng);
    if (dist < minDist) {
      minDist = dist;
      bestNode = nodeId;
    }
  }

  return bestNode;
};

export const updateGraphRiskWeights = async (graph) => {
  const dangerZones = await query('SELECT * FROM danger_zones');

  for (const edge of graph.edges) {
    const u = graph.nodes[edge.u];
    const v = graph.nodes[edge.v];
    const midLat = (u.lat + v.lat) / 2.0;
    const midLng = (u.lng + v.lng) / 2.0;

    let edgeRisk = 0.0;

    for (const zone of dangerZones) {
      const dist = haversineDistance(midLat, midLng, zone.center_lat, zone.center_lng);
      const effectiveRadius = Math.max(250.0, zone.radius_meters * 1.5);

      if (dist <= effectiveRadius) {
        const decay = 1.0 - dist / effectiveRadius;
        const penalty = Math.pow(zone.risk_score, 2.2) * Math.pow(decay, 1.5);
        edgeRisk += penalty;
      }
    }

    edge.riskPenalty = Math.round(edgeRisk * 1000) / 1000;
  }

  return graph;
};

// Standard Dijkstra shortest path implementation on weighted graph
export const dijkstra = (graph, startNode, endNode, weightFn) => {
  const distances = {};
  const previous = {};
  const unvisited = new Set(Object.keys(graph.nodes));

  for (const nodeId in graph.nodes) {
    distances[nodeId] = Infinity;
  }
  distances[startNode] = 0;

  while (unvisited.size > 0) {
    let current = null;
    let shortestDist = Infinity;

    for (const nodeId of unvisited) {
      if (distances[nodeId] < shortestDist) {
        shortestDist = distances[nodeId];
        current = nodeId;
      }
    }

    if (!current || distances[current] === Infinity || current === endNode) {
      break;
    }

    unvisited.delete(current);

    const neighbors = graph.adjacency[current] || [];
    for (const { target, edge } of neighbors) {
      if (!unvisited.has(target)) continue;

      const weight = weightFn(edge);
      const alt = distances[current] + weight;
      if (alt < distances[target]) {
        distances[target] = alt;
        previous[target] = current;
      }
    }
  }

  const path = [];
  let u = endNode;
  while (u) {
    path.unshift(u);
    u = previous[u];
  }

  return path.length > 0 && path[0] === startNode ? path : [startNode, endNode];
};

export const computeRoutesComparison = async (originLat, originLng, destLat, destLng) => {
  const centerLat = (originLat + destLat) / 2.0;
  const centerLng = (originLng + destLng) / 2.0;

  let graph = buildLocalRoadGraph(centerLat, centerLng, 9, 0.003);
  graph = await updateGraphRiskWeights(graph);

  const startNode = findNearestNode(graph, originLat, originLng);
  const endNode = findNearestNode(graph, destLat, destLng);

  // 1. Shortest Route (Pure physical length)
  const shortestNodes = dijkstra(graph, startNode, endNode, (edge) => edge.length);

  // 2. Fastest Route (Length / walking speed)
  const fastestNodes = dijkstra(graph, startNode, endNode, (edge) => edge.length / WALKING_SPEED_MPS);

  // 3. Safest Route (Dijkstra heavily penalized around active danger zones)
  const safestNodes = dijkstra(
    graph,
    startNode,
    endNode,
    (edge) => edge.length * (1.0 + edge.riskPenalty * 15.0)
  );

  const constructRouteDetail = (pathNodes, routeType) => {
    const coords = [];
    coords.push([originLat, originLng]);

    let totalDistM = 0.0;
    let totalRisk = 0.0;

    for (let i = 0; i < pathNodes.length; i++) {
      const nId = pathNodes[i];
      const n = graph.nodes[nId];
      if (n) {
        coords.push([n.lat, n.lng]);
      }

      if (i > 0) {
        const prevId = pathNodes[i - 1];
        const edge = (graph.adjacency[prevId] || []).find((adj) => adj.target === nId)?.edge;
        if (edge) {
          totalDistM += edge.length;
          totalRisk += edge.riskPenalty;
        }
      }
    }

    coords.push([destLat, destLng]);

    const distKm = Math.round((totalDistM / 1000.0) * 100) / 100;
    const timeMins = Math.round((totalDistM / WALKING_SPEED_MPS / 60.0) * 10) / 10;
    const riskScore =
      Math.round(Math.min(10.0, Math.max(0.5, totalRisk / Math.max(1.0, pathNodes.length))) * 10) / 10;

    const tier = riskScore < 3.5 ? 'safe' : riskScore < 7.0 ? 'warning' : 'danger';

    const summaries = {
      safest: '🛡-[#7C3AED] Recommended: Max safety detour bypassing danger zones',
      shortest: '💙-[#3B82F6] Direct path: Minimum physical walking distance',
      fastest: '🩶-[#64748B] Express path: Optimized travel time'
    };

    return {
      type: routeType,
      coordinates: coords,
      total_distance_km: distKm > 0.05 ? distKm : 0.1,
      total_time_minutes: timeMins > 1 ? timeMins : 2.0,
      total_risk_score: riskScore,
      risk_tier: tier,
      summary: summaries[routeType] || 'Calculated route'
    };
  };

  return {
    fastest: constructRouteDetail(fastestNodes, 'fastest'),
    shortest: constructRouteDetail(shortestNodes, 'shortest'),
    safest: constructRouteDetail(safestNodes, 'safest')
  };
};
