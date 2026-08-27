import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

export default function LiveMap({
  userLocation,
  isSosActive = false,
  locationHistory = [],
  guardians = []
}) {
  // Default coordinates (e.g. San Francisco / NYC / London fallback if geolocation is pending)
  const defaultCenter = [37.7749, -122.4194];
  const currentCenter = userLocation ? [userLocation.lat, userLocation.lng] : defaultCenter;

  const polylineCoords = locationHistory.map(loc => [loc.lat, loc.lng]);

  return (
    <div className="relative w-full h-[400px] md:h-[480px] rounded-3xl overflow-hidden shadow-lg border border-purple-100/80 z-0">
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
    </div>
  );
}
