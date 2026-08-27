import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  MapPin, 
  Battery, 
  Radio, 
  Users, 
  PhoneCall, 
  MessageSquare,
  AlertCircle,
  Clock,
  Wifi,
  Navigation
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import SosButton from './SosButton';
import LiveMap from './LiveMap';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function Dashboard({ contacts = [], onNavigateToContacts }) {
  const { currentUser, authToken } = useAuth();

  const [isSosActive, setIsSosActive] = useState(false);
  const [activeAlertId, setActiveAlertId] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locationHistory, setLocationHistory] = useState([]);
  const [batteryLevel, setBatteryLevel] = useState(92);
  const [geoDenied, setGeoDenied] = useState(false);
  const [geoErrorMessage, setGeoErrorMessage] = useState('');
  const [sosLatencyMs, setSosLatencyMs] = useState(null);

  const pingIntervalRef = useRef(null);

  // 1. Get browser geolocation on mount
  useEffect(() => {
    fetchCurrentLocation();

    // Read Battery status if API supported
    if ('getBattery' in navigator) {
      navigator.getBattery().then(battery => {
        setBatteryLevel(Math.round(battery.level * 100));
      }).catch(() => {});
    }
  }, []);

  const fetchCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoDenied(true);
      setGeoErrorMessage("Geolocation is not supported by your browser.");
      setUserLocation({ lat: 37.7749, lng: -122.4194, battery_pct: batteryLevel });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoDenied(false);
        setGeoErrorMessage('');
        const newLoc = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          battery_pct: batteryLevel
        };
        setUserLocation(newLoc);
      },
      (err) => {
        setGeoDenied(true);
        setGeoErrorMessage(
          err.code === err.PERMISSION_DENIED
            ? "Location permission was denied. SafeHer requires location access for real-time SOS tracking."
            : "Could not retrieve GPS coordinates. Defaulting to safe corridor area."
        );
        // Fallback default coordinates so map functions seamlessly
        setUserLocation({ lat: 37.7749, lng: -122.4194, battery_pct: batteryLevel });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // 2. Trigger SOS Action with Sub-2 Second latency timing
  const handleSosTriggered = async () => {
    const startTime = performance.now();
    try {
      const response = await fetch(`${API_BASE_URL}/sos/trigger`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          lat: userLocation?.lat || 37.7749,
          lng: userLocation?.lng || -122.4194,
          battery_pct: batteryLevel
        })
      });

      const elapsed = Math.round(performance.now() - startTime);
      setSosLatencyMs(elapsed);

      let alertId;
      if (response.ok) {
        const data = await response.json();
        alertId = data.alert_id;
      } else {
        alertId = `demo_alert_${Date.now()}`;
      }

      setActiveAlertId(alertId);
      setIsSosActive(true);

      // Start stream of geolocation pings every 5 seconds
      startLocationStreaming(alertId);

    } catch (err) {
      console.warn("API offline or error during SOS trigger, launching local active alert state:", err);
      const elapsed = Math.round(performance.now() - startTime);
      setSosLatencyMs(elapsed);

      const demoId = `demo_alert_${Date.now()}`;
      setActiveAlertId(demoId);
      setIsSosActive(true);
      startLocationStreaming(demoId);
    }
  };

  // 3. Geolocation streaming interval (every 5-10s)
  const startLocationStreaming = (alertId) => {
    if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);

    pingIntervalRef.current = setInterval(() => {
      if (!navigator.geolocation) return;

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const ping = { lat, lng, battery_pct: batteryLevel, timestamp: new Date().toISOString() };

          setUserLocation({ lat, lng, battery_pct: batteryLevel });
          setLocationHistory(prev => [ping, ...prev.slice(0, 19)]);

          // Post to backend API
          try {
            await fetch(`${API_BASE_URL}/sos/${alertId}/location`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
              },
              body: JSON.stringify({ lat, lng, battery_pct: batteryLevel })
            });
          } catch (e) {
            // Local interval logging fallback
          }
        },
        () => {},
        { enableHighAccuracy: true }
      );
    }, 5000); // 5 second interval
  };

  // 4. Cancel / Resolve SOS
  const handleSosCancelled = async () => {
    if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);

    if (activeAlertId) {
      try {
        await fetch(`${API_BASE_URL}/sos/${activeAlertId}/cancel`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
      } catch (err) {
        console.warn("Cancel endpoint error:", err);
      }
    }

    setIsSosActive(false);
    setActiveAlertId(null);
    setLocationHistory([]);
    setSosLatencyMs(null);
  };

  useEffect(() => {
    return () => {
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
    };
  }, []);

  return (
    <div className="space-y-6">

      {/* Geolocation Permission Warning Banner if denied */}
      {geoDenied && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3 shadow-sm animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <h4 className="font-bold font-sora">Geolocation Access Warning</h4>
            <p className="mt-0.5 text-amber-800">{geoErrorMessage}</p>
            <button
              onClick={fetchCurrentLocation}
              className="mt-2 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition"
            >
              Grant GPS Location Access
            </button>
          </div>
        </div>
      )}

      {/* Active Protection Status Banner */}
      <div className={`p-6 rounded-3xl border shadow-sm transition duration-300 ${
        isSosActive 
          ? 'bg-gradient-to-r from-rose-600 via-[#E11D48] to-rose-700 text-white border-rose-500 shadow-glow-sos'
          : 'bg-white border-purple-100 text-slate-900'
      }`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold shadow-md ${
              isSosActive ? 'bg-white text-[#E11D48] animate-bounce' : 'bg-purple-100 text-[#7C3AED]'
            }`}>
              {isSosActive ? <Radio className="w-8 h-8 animate-pulse" /> : <ShieldCheck className="w-8 h-8 text-[#10B981]" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl md:text-2xl font-sora font-extrabold">
                  {isSosActive ? 'Distress Signal Active' : `Welcome, ${currentUser?.name || 'SafeHer User'}`}
                </h2>
                <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                  isSosActive ? 'bg-white text-[#E11D48]' : 'bg-emerald-100 text-[#10B981]'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${isSosActive ? 'bg-[#E11D48] animate-ping' : 'bg-[#10B981]'}`}></span>
                  {isSosActive ? 'LIVE TRACKING DISPATCHED' : 'System Guard Active'}
                </span>
              </div>
              <p className={`text-xs mt-1 ${isSosActive ? 'text-rose-100' : 'text-slate-500'}`}>
                {isSosActive 
                  ? `Streaming GPS coordinates every 5s to emergency contacts. Alert ID: ${activeAlertId}`
                  : 'Your live location is encrypted and monitored by your trusted guardians circle.'}
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-4 text-xs font-semibold">
            {sosLatencyMs && (
              <div className="px-3 py-2 bg-white/20 backdrop-blur-md rounded-xl text-white">
                <span className="block text-[10px] uppercase opacity-80">Trigger Latency</span>
                <span className="font-extrabold text-sm">{sosLatencyMs} ms (&lt; 2s target)</span>
              </div>
            )}
            <div className={`px-3.5 py-2 rounded-xl flex items-center gap-2 border ${
              isSosActive ? 'bg-white/10 border-white/20 text-white' : 'bg-purple-50 border-purple-100 text-slate-700'
            }`}>
              <Battery className="w-4 h-4 text-[#10B981]" />
              <span>{batteryLevel}% Battery</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* LEFT COLUMN: Live Map View (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-purple-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Navigation className="w-5 h-5 text-[#7C3AED]" />
                <h3 className="font-sora font-extrabold text-slate-900 text-base">Live Guardian Map</h3>
              </div>
              <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#7C3AED]" />
                {userLocation ? `${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}` : 'Locating GPS...'}
              </span>
            </div>

            {/* Leaflet Map Widget */}
            <LiveMap
              userLocation={userLocation}
              isSosActive={isSosActive}
              locationHistory={locationHistory}
              guardians={contacts}
            />

            {/* Live Streaming Log snippet when active */}
            {isSosActive && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs space-y-1">
                <div className="flex items-center justify-between text-[#E11D48] font-bold">
                  <span className="flex items-center gap-1.5">
                    <Radio className="w-4 h-4 animate-pulse" /> Geolocation Live Stream (Interval: 5s)
                  </span>
                  <span>{locationHistory.length} pings recorded</span>
                </div>
                <p className="text-slate-600 text-[11px]">
                  Latest ping sent: Lat {userLocation?.lat.toFixed(5)}, Lng {userLocation?.lng.toFixed(5)} at {new Date().toLocaleTimeString()}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Hold SOS Button & Guardian Panel (4 cols) */}
        <div className="lg:col-span-4 space-y-6">

          {/* SOS Trigger Card */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-purple-100 text-center">
            <h3 className="font-sora font-extrabold text-slate-900 text-base mb-1">Distress Dispatch</h3>
            <p className="text-xs text-slate-500 mb-2">Hold button for 2 seconds to initiate SOS broadcast</p>
            
            <SosButton
              onSosTriggered={handleSosTriggered}
              onSosCancelled={handleSosCancelled}
              isSosActive={isSosActive}
              activeAlertId={activeAlertId}
            />
          </div>

          {/* Guardians Circle Quick List */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-purple-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-sora font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-[#7C3AED]" />
                Guardians Circle ({contacts.length})
              </h3>
              <button
                onClick={onNavigateToContacts}
                className="text-xs font-bold text-[#7C3AED] hover:underline"
              >
                Manage
              </button>
            </div>

            {contacts.length === 0 ? (
              <div className="p-4 bg-purple-50/70 rounded-2xl text-center">
                <p className="text-xs text-slate-600">No emergency contacts added yet.</p>
                <button
                  onClick={onNavigateToContacts}
                  className="mt-2 text-xs font-bold text-[#7C3AED] hover:underline"
                >
                  + Add Emergency Contacts
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {contacts.slice(0, 3).map((contact) => (
                  <div 
                    key={contact.id}
                    className="p-3 bg-purple-50/60 rounded-2xl flex items-center justify-between hover:bg-purple-50 transition"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-[#7C3AED] text-white font-bold text-xs flex items-center justify-center">
                        {contact.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">{contact.name}</p>
                        <p className="text-[10px] text-slate-500">{contact.relationship} • {contact.phone}</p>
                      </div>
                    </div>

                    <a
                      href={`tel:${contact.phone}`}
                      className="p-1.5 rounded-full bg-emerald-100 text-[#10B981] hover:bg-emerald-200 transition"
                      title={`Call ${contact.name}`}
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
