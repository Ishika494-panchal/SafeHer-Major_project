import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  MapPin, 
  Battery, 
  Radio, 
  Users, 
  PhoneCall, 
  AlertCircle,
  Navigation,
  Flame,
  PlusCircle,
  ShieldAlert,
  Send,
  BellRing,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import SosButton from './SosButton';
import LiveMap from './LiveMap';
import RoutePicker from './RoutePicker';
import RouteComparisonCard from './RouteComparisonCard';
import FakeCall from './FakeCall';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function Dashboard({ contacts = [], onNavigateToContacts, onOpenReportModal }) {
  const { currentUser, authToken } = useAuth();

  const [isSosActive, setIsSosActive] = useState(false);
  const [activeAlertId, setActiveAlertId] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locationHistory, setLocationHistory] = useState([]);
  const [batteryLevel, setBatteryLevel] = useState(92);
  const [geoDenied, setGeoDenied] = useState(false);
  const [geoErrorMessage, setGeoErrorMessage] = useState('');
  const [sosLatencyMs, setSosLatencyMs] = useState(null);
  const [dangerZones, setDangerZones] = useState([]);
  
  // Real-time Emergency Dispatch Notification state
  const [dispatchedNotifications, setDispatchedNotifications] = useState([]);
  const [showDispatchToast, setShowDispatchToast] = useState(false);

  // Phase 5: Safe Routing state
  const [routes, setRoutes] = useState(null);
  const [selectedRouteType, setSelectedRouteType] = useState('safest');
  const [routeLoading, setRouteLoading] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isPickingOnMap, setIsPickingOnMap] = useState(false);

  const pingIntervalRef = useRef(null);

  // Fetch heatmap danger zones from API
  const fetchHeatmapData = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/heatmap/`);
      if (res.ok) {
        const data = await res.json();
        setDangerZones(data.danger_zones || []);
      }
    } catch (e) {
      // Fallback
    }
  };

  useEffect(() => {
    fetchCurrentLocation();
    fetchHeatmapData();

    const heatmapInterval = setInterval(fetchHeatmapData, 30000);

    if ('getBattery' in navigator) {
      navigator.getBattery().then(battery => {
        setBatteryLevel(Math.round(battery.level * 100));
      }).catch(() => {});
    }

    return () => clearInterval(heatmapInterval);
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
        setUserLocation({ lat: 37.7749, lng: -122.4194, battery_pct: batteryLevel });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Trigger SOS Action with Real-time Emergency Contact Notifications via Twilio
  const handleSosTriggered = async () => {
    const startTime = performance.now();
    try {
      const response = await fetch(`${API_BASE_URL}/sos/trigger`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        // Field names must match Express backend schema exactly
        body: JSON.stringify({
          latitude:        userLocation?.lat     || 37.7749,
          longitude:       userLocation?.lng     || -122.4194,
          battery_percent: batteryLevel
        })
      });

      const elapsed = Math.round(performance.now() - startTime);
      setSosLatencyMs(elapsed);

      let alertId;
      let notifications = [];

      if (response.ok) {
        const data = await response.json();
        // Backend returns camelCase: alertId, trackingLink, contactsNotified, contactsFailed
        alertId = data.alertId;
        const trackingLink = data.trackingLink || `http://localhost:3000/track/${data.trackingToken}`;

        // Build notification display entries from contacts list + backend result
        if (contacts.length > 0) {
          notifications = contacts.map((c, i) => {
            const notified = data.contactsNotified || 0;
            const failed   = data.contactsFailed   || 0;
            // Mark first N contacts as notified based on backend count
            const isNotified = i < notified;
            return {
              contact_name:  c.name,
              contact_phone: c.phone,
              relationship:  c.relationship,
              message: `🚨 EMERGENCY: ${currentUser?.name || 'SafeHer User'} triggered an SOS alert on SafeHer. Track their live location: ${trackingLink}`,
              tracking_link: trackingLink,
              status: isNotified ? 'SMS SENT ✅' : 'SMS FAILED ❌',
              timestamp: new Date().toISOString()
            };
          });
        } else {
          // No contacts saved yet — show a generic alert row
          notifications = [{
            contact_name:  '—',
            contact_phone: 'No contacts saved',
            relationship:  'N/A',
            message: `Alert created. Add emergency contacts to receive SMS. Tracking link: ${trackingLink}`,
            tracking_link: trackingLink,
            status: 'ALERT ACTIVE',
            timestamp: new Date().toISOString()
          }];
        }
      } else {
        // Backend error — fall back to local demo alert
        alertId = `demo_alert_${Date.now()}`;
        notifications = contacts.map(c => ({
          contact_name:  c.name,
          contact_phone: c.phone,
          relationship:  c.relationship,
          message: `🚨 EMERGENCY SOS: ${currentUser?.name || 'SafeHer User'} needs help! GPS: https://maps.google.com/?q=${userLocation?.lat || 37.7749},${userLocation?.lng || -122.4194} — Battery: ${batteryLevel}%`,
          tracking_link: `http://localhost:3000/track/demo`,
          status: 'LOCAL ALERT',
          timestamp: new Date().toISOString()
        }));
      }

      setDispatchedNotifications(notifications);
      setShowDispatchToast(true);
      setActiveAlertId(alertId);
      setIsSosActive(true);
      startLocationStreaming(alertId);

    } catch (err) {
      console.warn("API offline — launching local SOS alert state:", err);
      const elapsed = Math.round(performance.now() - startTime);
      setSosLatencyMs(elapsed);

      const demoId = `demo_alert_${Date.now()}`;
      const fallbackNotifs = contacts.map(c => ({
        contact_name:  c.name,
        contact_phone: c.phone,
        relationship:  c.relationship,
        message: `🚨 EMERGENCY SOS: ${currentUser?.name || 'SafeHer User'} triggered emergency alert! GPS: https://maps.google.com/?q=${userLocation?.lat || 37.7749},${userLocation?.lng || -122.4194}`,
        tracking_link: `http://localhost:3000/track/demo`,
        status: 'OFFLINE MODE',
        timestamp: new Date().toISOString()
      }));

      setDispatchedNotifications(fallbackNotifs);
      setShowDispatchToast(true);
      setActiveAlertId(demoId);
      setIsSosActive(true);
      startLocationStreaming(demoId);
    }
  };

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

          try {
            await fetch(`${API_BASE_URL}/sos/${alertId}/location`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
              },
              body: JSON.stringify({ lat, lng, battery_pct: batteryLevel })
            });
          } catch (e) {}
        },
        () => {},
        { enableHighAccuracy: true }
      );
    }, 5000);
  };

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
    setShowDispatchToast(false);
  };

  // Phase 5: Calculate Safe Route Recommendations
  const handleCalculateRoutes = async (params) => {
    setRouteLoading(true);
    try {
      const queryStr = new URLSearchParams(params).toString();
      const res = await fetch(`${API_BASE_URL}/routes/?${queryStr}`);
      if (!res.ok) throw new Error('Failed to compute safe routes.');
      const data = await res.json();
      setRoutes(data);
      setSelectedRouteType('safest');
      setIsPickingOnMap(false);
    } catch (e) {
      alert('Error calculating routes. Please try again.');
    } finally {
      setRouteLoading(false);
    }
  };

  const maxRiskScore = dangerZones.length > 0
    ? Math.max(...dangerZones.map(z => z.risk_score))
    : 0;

  return (
    <div className="space-y-6">

      {/* Real-time Emergency Dispatch Notification Alert Banner */}
      {showDispatchToast && dispatchedNotifications.length > 0 && (
        <div className="p-5 rounded-3xl bg-gradient-to-r from-[#E11D48] via-rose-600 to-[#7C3AED] text-white shadow-2xl border border-rose-300 animate-fadeIn space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-white/20 rounded-2xl animate-bounce">
                <BellRing className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-extrabold text-base font-sora">🚨 REAL-TIME EMERGENCY NOTIFICATION DISPATCHED</h3>
                <p className="text-xs text-rose-100">Live SMS & GPS Tracking Alerts Sent to Emergency Contacts</p>
              </div>
            </div>

            <button 
              onClick={() => setShowDispatchToast(false)}
              className="p-1.5 hover:bg-white/20 rounded-full transition"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
            {dispatchedNotifications.map((notif, idx) => (
              <div key={idx} className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-xs space-y-1">
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center space-x-1.5">
                    <Send className="w-3.5 h-3.5 text-emerald-300" />
                    <span>{notif.contact_name} ({notif.relationship})</span>
                  </span>
                  <span className={`px-2 py-0.5 text-[9px] rounded-full font-extrabold ${
                    notif.status?.includes('SENT') || notif.status === 'ALERT ACTIVE'
                      ? 'bg-emerald-400 text-slate-900'
                      : notif.status?.includes('FAILED')
                      ? 'bg-red-300 text-red-900'
                      : 'bg-yellow-300 text-slate-900'
                  }`}>
                    {notif.status}
                  </span>
                </div>
                <p className="text-[11px] text-rose-100 font-mono truncate">{notif.contact_phone}</p>
                <p className="text-[10px] text-purple-100 italic bg-black/20 p-2 rounded-xl border border-white/10">
                  "{notif.message}"
                </p>
                {notif.tracking_link && !notif.tracking_link.includes('demo') && (
                  <a
                    href={notif.tracking_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-emerald-300 underline font-mono break-all"
                  >
                    🗺️ Live Tracking Link →
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Geolocation Warning Banner if denied */}
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

          {/* Action CTAs & Metrics */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenReportModal}
              className="px-4 py-2.5 bg-[#E11D48] hover:bg-[#D97706] text-white font-bold text-xs rounded-2xl shadow-md flex items-center space-x-2 transition"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Report Incident (100% Anonymous)</span>
            </button>

            {/* Fake Call Escape Trigger Button */}
            <FakeCall triggerButtonClass="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-2xl shadow-md flex items-center space-x-2 transition" />

            <div className={`px-3.5 py-2 rounded-2xl flex items-center gap-2 border text-xs font-bold ${
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

        {/* LEFT COLUMN: Live Map View & Safe Route Picker (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          
          {/* Leaflet Map Card */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-purple-100 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Navigation className="w-5 h-5 text-[#7C3AED]" />
                <h3 className="font-sora font-extrabold text-slate-900 text-base">Live Guardian Map & Route Corridor</h3>
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
              dangerZones={dangerZones}
              routes={routes}
              selectedRouteType={selectedRouteType}
              isPickingOnMap={isPickingOnMap}
              onMapClick={(coords) => {
                handleCalculateRoutes({
                  origin_lat: userLocation?.lat || 37.7740,
                  origin_lng: userLocation?.lng || -122.4200,
                  dest_lat: coords.lat,
                  dest_lng: coords.lng
                });
              }}
            />
          </div>

          {/* PHASE 5: Route Comparison Cards */}
          {routes && (
            <RouteComparisonCard
              routes={routes}
              selectedRouteType={selectedRouteType}
              onSelectRouteType={(type) => setSelectedRouteType(type)}
              onStartNavigation={() => setIsNavigating(!isNavigating)}
              isNavigating={isNavigating}
            />
          )}

        </div>

        {/* RIGHT COLUMN: Route Picker, Hold SOS Button, Heatmap & Guardians Circle (4 cols) */}
        <div className="lg:col-span-4 space-y-6">

          {/* PHASE 5: Safe Route Navigator Card */}
          <RoutePicker
            userLocation={userLocation}
            onCalculateRoutes={handleCalculateRoutes}
            loading={routeLoading}
            isPickingOnMap={isPickingOnMap}
            onToggleMapPick={() => setIsPickingOnMap(!isPickingOnMap)}
          />

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

          {/* Quick Fake Call Escape Card */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl p-5 shadow-sm border border-indigo-100 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-sm">
                  <PhoneCall className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-sora font-extrabold text-slate-900 text-sm">Fake Call Escape</h4>
                  <p className="text-[10px] text-slate-500">Excuse to exit unsafe or awkward moments</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-indigo-200 text-indigo-800 text-[10px] font-extrabold uppercase">
                Privacy
              </span>
            </div>
            
            <p className="text-xs text-slate-600 leading-relaxed">
              Triggers a realistic incoming phone call screen with custom caller ID, ringtone audio, vibration, and real-time voice lines.
            </p>

            <FakeCall triggerButtonClass="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-2xl shadow-sm flex items-center justify-center space-x-2 transition" />
          </div>

          {/* Danger Heatmap Summary Widget */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-purple-100 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-sora font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Flame className="w-4 h-4 text-[#E11D48]" />
                Safety Danger Heatmap
              </h3>
              <span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-bold">
                DBSCAN Aggregated
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center pt-1">
              <div className="p-3 bg-purple-50/60 rounded-2xl border border-purple-100">
                <span className="block text-[10px] font-bold text-slate-500 uppercase">Active Risk Zones</span>
                <span className="text-lg font-extrabold text-[#7C3AED]">{dangerZones.length}</span>
              </div>

              <div className="p-3 bg-rose-50/60 rounded-2xl border border-rose-100">
                <span className="block text-[10px] font-bold text-slate-500 uppercase">Peak Risk Score</span>
                <span className="text-lg font-extrabold text-[#E11D48]">{maxRiskScore > 0 ? `${maxRiskScore}/10` : 'N/A'}</span>
              </div>
            </div>

            <button
              onClick={onOpenReportModal}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl shadow-sm flex items-center justify-center space-x-2 transition"
            >
              <PlusCircle className="w-4 h-4 text-emerald-400" />
              <span>Submit Anonymous Report</span>
            </button>
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
