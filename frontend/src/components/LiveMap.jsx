import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import { Flame, ShieldAlert, AlertTriangle, ShieldCheck, Navigation, MapPin } from 'lucide-react';

/**
 * HeatmapLayer — integrates the vanilla leaflet.heat plugin inside react-leaflet.
 * Since leaflet.heat has no official React bindings, we use the useMap() hook
 * to access the raw Leaflet map instance and manually manage the heat layer lifecycle.
 */
function HeatmapLayer({ points, options }) {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    if (!map || !points || points.length === 0) {
      if (layerRef.current) {
        layerRef.current.remove();
        layerRef.current = null;
      }
      return;
    }

    // Convert [{lat, lng, weight}] → [[lat, lng, weight]] for L.heatLayer
    const heatData = points.map((p) => [p.lat, p.lng, p.weight || 1]);

    const defaultOptions = {
      radius: 25,
      blur: 20,
      maxZoom: 17,
      max: 1.0,
      gradient: {
        0.2: '#10B981',  // Green — low density
        0.5: '#F59E0B',  // Amber — medium density
        0.8: '#E11D48',  // Red — high density
        1.0: '#991B1B',  // Deep red — hotspot
      },
      ...options,
    };

    // Remove previous layer before creating a new one
    if (layerRef.current) {
      layerRef.current.remove();
    }

    layerRef.current = L.heatLayer(heatData, defaultOptions).addTo(map);

    return () => {
      if (layerRef.current) {
        layerRef.current.remove();
        layerRef.current = null;
      }
    };
  }, [map, points, options]);

  return null;
}

// Fix for default Leaflet marker icon paths in React/Vite builds
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom user location pin icon
const createCustomIcon = (color, isSos = false) => {
  const svg = isSos
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="${color}" stroke="#FFFFFF" stroke-width="2"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="3" fill="#FFFFFF"/></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="${color}" stroke="#FFFFFF" stroke-width="2"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5" fill="#FFFFFF"/></svg>`;

  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: svg,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
};

const userIcon = createCustomIcon('#7C3AED');
const sosIcon = createCustomIcon('#E11D48', true);
const guardianIcon = createCustomIcon('#10B981');
const destIcon = createCustomIcon('#F59E0B');

// Helper to auto-recenter map when coordinates update
function MapRecenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
}

// Map Click Listener Component
function MapClickListener({ onMapClick, isPickingOnMap }) {
  useMapEvents({
    click(e) {
      if (isPickingOnMap && onMapClick) {
        onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    },
  });
  return null;
}

export default function LiveMap({
  userLocation,
  isSosActive = false,
  locationHistory = [],
  guardians = [],
  dangerZones = [],
  heatmapPoints = [],
  routes = null,
  selectedRouteType = 'safest',
  isPickingOnMap = false,
  onMapClick = null
}) {
  const [showHeatmap, setShowHeatmap] = useState(true);

  // Default coordinates fallback
  const defaultCenter = [37.7749, -122.4194];
  const currentCenter = userLocation ? [userLocation.lat, userLocation.lng] : defaultCenter;

  const polylineCoords = locationHistory.map(loc => [loc.lat, loc.lng]);

  const getRiskStyle = (score) => {
    if (score >= 7.0) {
      return {
        color: '#E11D48',       // Pink / Red (High Risk)
        fillColor: '#E11D48',
        fillOpacity: 0.35,
        strokeWeight: 2,
        label: 'HIGH RISK DANGER ZONE',
        badgeBg: 'bg-rose-100 text-rose-700',
      };
    } else if (score >= 4.0) {
      return {
        color: '#F59E0B',       // Amber / Orange (Medium Risk)
        fillColor: '#F59E0B',
        fillOpacity: 0.25,
        strokeWeight: 1.5,
        label: 'MEDIUM RISK WARNING',
        badgeBg: 'bg-amber-100 text-amber-800',
      };
    } else {
      return {
        color: '#10B981',       // Mint / Green (Safe)
        fillColor: '#10B981',
        fillOpacity: 0.15,
        strokeWeight: 1,
        label: 'MONITORED SAFE ZONE',
        badgeBg: 'bg-emerald-100 text-emerald-800',
      };
    }
  };

  return (
    <div className={`relative w-full h-[420px] md:h-[500px] rounded-3xl overflow-hidden shadow-lg border transition-all duration-300 z-0 ${
      isPickingOnMap ? 'ring-4 ring-rose-500/50 border-rose-500 cursor-crosshair' : 'border-purple-100/80'
    }`}>
      <MapContainer
        center={currentCenter}
        zoom={15}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapRecenter center={currentCenter} />
        <MapClickListener onMapClick={onMapClick} isPickingOnMap={isPickingOnMap} />

        {/* LEAFLET.HEAT DENSITY HEATMAP LAYER */}
        {showHeatmap && heatmapPoints.length > 0 && (
          <HeatmapLayer points={heatmapPoints} />
        )}

        {/* DANGER ZONES CIRCLE OVERLAYS */}
        {showHeatmap && dangerZones.map((zone, idx) => {
          const style = getRiskStyle(zone.risk_score);
          return (
            <React.Fragment key={zone.id || idx}>
              <Circle
                center={[zone.center_lat, zone.center_lng]}
                radius={zone.radius_meters || 300}
                pathOptions={{
                  color: style.color,
                  fillColor: style.fillColor,
                  fillOpacity: style.fillOpacity,
                  weight: style.strokeWeight,
                }}
              >
                <Popup>
                  <div className="p-1 font-sans text-xs space-y-1.5 max-w-[220px]">
                    <div className="flex items-center space-x-1 font-bold">
                      <Flame className="w-4 h-4 text-[#E11D48]" />
                      <span className={style.color === '#E11D48' ? 'text-[#E11D48]' : 'text-slate-800'}>
                        {style.label}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <span>Risk Score:</span>
                      <span className="font-extrabold text-sm" style={{ color: style.color }}>
                        {zone.risk_score} / 10
                      </span>
                    </div>

                    <p className="text-slate-600 text-[11px]">
                      Based on <strong>{zone.report_count}</strong> verified anonymous incident report(s) in this cluster.
                    </p>

                    <div className="text-[10px] text-slate-500 font-semibold pt-1 border-t border-slate-100">
                      💡 Tip: Exercise caution, stay on well-lit main streets.
                    </div>
                  </div>
                </Popup>
              </Circle>
            </React.Fragment>
          );
        })}

        {/* PHASE 5: MULTI-ROUTE POLYLINES */}
        {routes && (
          <>
            {/* 1. FASTEST ROUTE (Slate Gray) */}
            {routes.fastest && routes.fastest.coordinates && (
              <Polyline
                positions={routes.fastest.coordinates}
                pathOptions={{
                  color: '#64748B',
                  weight: selectedRouteType === 'fastest' ? 6 : 3,
                  opacity: selectedRouteType === 'fastest' ? 0.95 : 0.4,
                  dashArray: '3, 6'
                }}
              />
            )}

            {/* 2. SHORTEST ROUTE (Blue) */}
            {routes.shortest && routes.shortest.coordinates && (
              <Polyline
                positions={routes.shortest.coordinates}
                pathOptions={{
                  color: '#3B82F6',
                  weight: selectedRouteType === 'shortest' ? 6 : 3,
                  opacity: selectedRouteType === 'shortest' ? 0.95 : 0.4,
                  dashArray: '6, 6'
                }}
              />
            )}

            {/* 3. SAFEST ROUTE (Violet - Differentiator) */}
            {routes.safest && routes.safest.coordinates && (
              <Polyline
                positions={routes.safest.coordinates}
                pathOptions={{
                  color: '#7C3AED',
                  weight: selectedRouteType === 'safest' ? 7 : 4,
                  opacity: selectedRouteType === 'safest' ? 0.95 : 0.5,
                }}
              />
            )}

            {/* Destination Point Marker */}
            {routes.safest && routes.safest.coordinates.length > 0 && (
              <Marker
                position={routes.safest.coordinates[routes.safest.coordinates.length - 1]}
                icon={destIcon}
              >
                <Popup>
                  <div className="p-1 font-sans text-xs">
                    <strong className="text-[#F59E0B]">🏁 Destination Point</strong>
                    <p className="text-slate-500 mt-0.5">End of Safe Corridor Route</p>
                  </div>
                </Popup>
              </Marker>
            )}
          </>
        )}

        {/* User Location Marker */}
        {userLocation && (
          <>
            <Marker
              position={[userLocation.lat, userLocation.lng]}
              icon={isSosActive ? sosIcon : userIcon}
            >
              <Popup>
                <div className="p-1 font-sans text-xs">
                  <strong className={isSosActive ? "text-[#E11D48]" : "text-[#7C3AED]"}>
                    {isSosActive ? "🚨 EMERGENCY SOS ACTIVE" : "📍 You (Live Location)"}
                  </strong>
                  <p className="text-slate-500 mt-1">
                    Lat: {userLocation.lat.toFixed(5)}, Lng: {userLocation.lng.toFixed(5)}
                  </p>
                  {userLocation.battery_pct !== undefined && (
                    <p className="text-slate-500">Battery: {userLocation.battery_pct}%</p>
                  )}
                </div>
              </Popup>
            </Marker>

            {/* Safety Radius Circle or SOS Beacon Pulsing Circle */}
            <Circle
              center={[userLocation.lat, userLocation.lng]}
              radius={isSosActive ? 300 : 150}
              pathOptions={{
                color: isSosActive ? '#E11D48' : '#7C3AED',
                fillColor: isSosActive ? '#E11D48' : '#7C3AED',
                fillOpacity: isSosActive ? 0.25 : 0.1,
                weight: isSosActive ? 2 : 1.5,
              }}
            />
          </>
        )}

        {/* SOS Location Trail Line */}
        {isSosActive && polylineCoords.length > 1 && (
          <Polyline
            positions={polylineCoords}
            pathOptions={{ color: '#E11D48', weight: 4, opacity: 0.8, dashArray: '6, 8' }}
          />
        )}

        {/* Guardians Nearby Markers */}
        {guardians.map((g, idx) => {
          if (!g.lat || !g.lng) return null;
          return (
            <Marker
              key={g.id || idx}
              position={[g.lat, g.lng]}
              icon={guardianIcon}
            >
              <Popup>
                <div className="p-1 text-xs font-sans">
                  <strong className="text-[#10B981]">🛡️ Guardian: {g.name}</strong>
                  <p className="text-slate-500 mt-0.5">{g.phone}</p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Floating Status Badge Overlay */}
      <div className="absolute top-4 left-4 z-[1000] bg-white/90 backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-md border border-purple-100 flex items-center gap-2 text-xs font-bold">
        <span className="relative flex h-2.5 w-2.5">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isSosActive ? 'bg-[#E11D48]' : 'bg-[#10B981]'} opacity-75`}></span>
          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isSosActive ? 'bg-[#E11D48]' : 'bg-[#10B981]'}`}></span>
        </span>
        <span className={isSosActive ? "text-[#E11D48]" : "text-slate-800"}>
          {isSosActive ? "Live GPS Emergency Broadcast" : "SafeHer GPS Protection Active"}
        </span>
      </div>

      {/* Heatmap Toggle & Legend Control (Top Right) */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col items-end gap-2">
        <button
          onClick={() => setShowHeatmap(!showHeatmap)}
          className={`px-3.5 py-2 rounded-2xl shadow-md border text-xs font-bold flex items-center space-x-1.5 transition backdrop-blur-md ${
            showHeatmap
              ? 'bg-[#7C3AED] text-white border-[#7C3AED]'
              : 'bg-white/90 text-slate-700 border-purple-100 hover:bg-purple-50'
          }`}
        >
          <Flame className="w-4 h-4 text-amber-300" />
          <span>{showHeatmap ? 'Danger Heatmap: ON' : 'Danger Heatmap: OFF'}</span>
        </button>

        {showHeatmap && (
          <div className="bg-white/90 backdrop-blur-md p-2.5 rounded-2xl shadow-md border border-purple-100 text-[10px] font-bold space-y-1.5">
            <div className="text-slate-500 font-extrabold uppercase tracking-wider text-[9px]">Heatmap Risk Scale</div>
            <div className="flex items-center space-x-1.5 text-rose-600">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E11D48] inline-block"></span>
              <span>High Risk (Score ≥ 7.0)</span>
            </div>
            <div className="flex items-center space-x-1.5 text-amber-600">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B] inline-block"></span>
              <span>Medium Risk (4.0 - 6.9)</span>
            </div>
            <div className="flex items-center space-x-1.5 text-emerald-600">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] inline-block"></span>
              <span>Monitored Safe Zone</span>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
