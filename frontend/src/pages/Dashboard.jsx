import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiCall } from '../api/client';
import { Shield, AlertTriangle, CheckCircle, Clock, MapPin, PhoneCall, RefreshCw, UserCheck } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';

export default function Dashboard() {
  const { user, token } = useAuth();

  // Woman state
  const [sosStatus, setSosStatus] = useState('idle'); // 'idle' | 'triggering' | 'active' | 'resolved'
  const [currentAlert, setCurrentAlert] = useState(null);
  const [womanContacts, setWomanContacts] = useState([]);
  const [triggerError, setTriggerError] = useState('');

  // Volunteer state
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [respondedAlerts, setRespondedAlerts] = useState([]);
  const [volunteerLoading, setVolunteerLoading] = useState(false);
  const [acceptingId, setAcceptingId] = useState(null);

  // Load woman's contacts & active alerts
  useEffect(() => {
    if (user?.role === 'woman') {
      fetchWomanContacts();
    } else if (user?.role === 'volunteer') {
      fetchActiveAlerts();
      const interval = setInterval(fetchActiveAlerts, 10000); // Poll every 10 seconds
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchWomanContacts = async () => {
    try {
      const data = await apiCall('/contacts', { token });
      setWomanContacts(data.contacts || []);
    } catch (err) {
      console.error('Failed to fetch contacts:', err.message);
    }
  };

  const fetchActiveAlerts = async () => {
    try {
      setVolunteerLoading(true);
      const data = await apiCall('/sos/active', { token });
      setActiveAlerts(data.alerts || []);
    } catch (err) {
      console.error('Failed to fetch active alerts:', err.message);
    } finally {
      setVolunteerLoading(false);
    }
  };

  // Trigger SOS for Woman
  const handleTriggerSOS = () => {
    setTriggerError('');
    setSosStatus('triggering');

    if (!navigator.geolocation) {
      // Fallback: call trigger without lat/lng, server will use location_history
      executeSOSCall(null, null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        executeSOSCall(position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        console.warn('Geolocation error, sending trigger without fresh coords:', error.message);
        executeSOSCall(null, null);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const executeSOSCall = async (latitude, longitude) => {
    try {
      const body = {};
      if (latitude !== null && longitude !== null) {
        body.latitude = latitude;
        body.longitude = longitude;
      }

      const data = await apiCall('/sos/trigger', {
        method: 'POST',
        body,
        token,
      });

      setCurrentAlert(data.alert);
      setSosStatus('active');
    } catch (err) {
      setTriggerError(err.message || 'Failed to trigger SOS alert');
      setSosStatus('idle');
    }
  };

  // Resolve SOS for Woman
  const handleResolveSOS = async () => {
    if (!currentAlert) return;
    try {
      await apiCall(`/sos/${currentAlert.id}/resolve`, {
        method: 'PATCH',
        token,
      });

      setSosStatus('resolved');
      setCurrentAlert(null);
    } catch (err) {
      setTriggerError(err.message || 'Failed to resolve alert');
    }
  };

  // Accept Alert for Volunteer
  const handleAcceptAlert = async (alertId) => {
    try {
      setAcceptingId(alertId);
      const data = await apiCall(`/sos/${alertId}/accept`, {
        method: 'PATCH',
        token,
      });

      setRespondedAlerts((prev) => [data.alert, ...prev]);
      setActiveAlerts((prev) => prev.filter((a) => a.id !== alertId));
    } catch (err) {
      alert(err.message || 'Failed to accept alert');
    } finally {
      setAcceptingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-safe-bg py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Welcome Banner */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-safe-ink">
              Welcome, {user?.name || 'User'}!
            </h1>
            <p className="text-safe-muted text-sm mt-0.5">
              {user?.role === 'woman'
                ? 'Your personal safety hub & emergency system'
                : 'SafeHer Volunteer Emergency Response Portal'}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs uppercase font-bold text-safe-muted">Status:</span>
            {user?.role === 'volunteer' ? (
              <span className="bg-green-100 text-safe-green border border-green-200 px-3 py-1 rounded-full text-xs font-bold flex items-center space-x-1">
                <UserCheck className="w-3.5 h-3.5" />
                <span>Verified Volunteer (On Duty)</span>
              </span>
            ) : (
              <span className="bg-purple-100 text-safe-purple border border-purple-200 px-3 py-1 rounded-full text-xs font-bold flex items-center space-x-1">
                <Shield className="w-3.5 h-3.5" />
                <span>Protected Account</span>
              </span>
            )}
          </div>
        </div>

        {/* WOMAN DASHBOARD */}
        {user?.role === 'woman' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* SOS Trigger Panel */}
            <div className="md:col-span-2 bg-white p-8 rounded-xl shadow-md border border-gray-100 flex flex-col items-center justify-center text-center">
              <h2 className="text-xl font-bold text-safe-ink mb-2">Emergency Assistance</h2>
              <p className="text-safe-muted text-sm max-w-md mb-6">
                Pressing the button below instantly notifies nearby verified volunteers and sends SMS alerts with your live location to your emergency contacts.
              </p>

              {triggerError && (
                <div className="mb-4 p-3 bg-red-50 border border-safe-red text-safe-red text-sm rounded-lg w-full max-w-md">
                  {triggerError}
                </div>
              )}

              {sosStatus === 'active' ? (
                <div className="flex flex-col items-center space-y-4">
                  {/* Active SOS Badge */}
                  <div className="bg-safe-red text-white px-6 py-3 rounded-full font-bold text-lg animate-pulse flex items-center space-x-2 shadow-lg">
                    <AlertTriangle className="w-6 h-6" />
                    <span>SOS ACTIVE - EMERGENCY BROADCASTED</span>
                  </div>

                  <p className="text-xs text-safe-muted max-w-sm">
                    Alert ID: <code className="bg-gray-100 px-1 rounded">{currentAlert?.id}</code>
                    <br />
                    Volunteers & contacts have been notified. Stay calm.
                  </p>

                  <button
                    onClick={handleResolveSOS}
                    className="mt-4 px-6 py-2.5 bg-safe-green text-white font-bold rounded-lg shadow hover:bg-green-700 transition-all flex items-center space-x-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    <span>I Am Safe (Resolve SOS)</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleTriggerSOS}
                  disabled={sosStatus === 'triggering'}
                  className="w-48 h-48 rounded-full bg-safe-red text-white font-black text-2xl shadow-xl hover:bg-red-700 hover:scale-105 active:scale-95 transition-all flex flex-col items-center justify-center space-y-2 border-4 border-red-200"
                >
                  <AlertTriangle className="w-12 h-12" />
                  <span>{sosStatus === 'triggering' ? 'SENDING...' : 'SOS'}</span>
                </button>
              )}
            </div>

            {/* Quick Emergency Contacts */}
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-safe-ink flex items-center space-x-2">
                  <PhoneCall className="w-5 h-5 text-safe-purple" />
                  <span>Emergency Contacts</span>
                </h3>
                <a href="/contacts" className="text-xs font-bold text-safe-purple-tint hover:underline">
                  Manage ({womanContacts.length}/5)
                </a>
              </div>

              {womanContacts.length === 0 ? (
                <div className="text-center py-6 text-safe-muted text-sm bg-safe-bg/50 rounded-lg border border-dashed border-gray-200 p-4">
                  <p>No contacts saved yet.</p>
                  <a
                    href="/contacts"
                    className="mt-2 inline-block text-xs bg-safe-purple text-white px-3 py-1.5 rounded font-bold hover:bg-safe-purple-tint"
                  >
                    + Add Contacts
                  </a>
                </div>
              ) : (
                <div className="space-y-3">
                  {womanContacts.map((c) => (
                    <div key={c.id} className="p-3 border border-gray-100 rounded-lg bg-safe-bg/30">
                      <div className="font-bold text-safe-ink text-sm">{c.name}</div>
                      <div className="text-xs text-safe-muted">{c.phone}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VOLUNTEER DASHBOARD */}
        {user?.role === 'volunteer' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-safe-ink flex items-center space-x-2">
                <AlertTriangle className="w-6 h-6 text-safe-red" />
                <span>Active Emergency Alerts Feed</span>
              </h2>

              <button
                onClick={fetchActiveAlerts}
                disabled={volunteerLoading}
                className="flex items-center space-x-1 text-xs font-bold bg-white border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 text-safe-ink"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${volunteerLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {activeAlerts.length === 0 ? (
              <div className="bg-white p-8 rounded-xl shadow-md border border-gray-100 text-center text-safe-muted">
                <CheckCircle className="w-12 h-12 mx-auto text-safe-green mb-3" />
                <h3 className="font-bold text-safe-ink text-lg">All Clear! No Active Alerts</h3>
                <p className="text-sm mt-1">Polling every 10 seconds for new emergency broadcasts in your area.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {activeAlerts.map((alertItem) => (
                  <div
                    key={alertItem.id}
                    className="bg-white p-6 rounded-xl shadow-md border-2 border-safe-red flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        {/* Status Badge: Active = Danger Red */}
                        <span className="bg-safe-red text-white text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider flex items-center space-x-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>ACTIVE SOS</span>
                        </span>
                        <span className="text-xs text-safe-muted flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{new Date(alertItem.created_at).toLocaleTimeString()}</span>
                        </span>
                      </div>

                      <div className="space-y-1 text-sm mb-4">
                        <div className="flex items-center space-x-1.5 text-safe-ink font-semibold">
                          <MapPin className="w-4 h-4 text-safe-red" />
                          <span>
                            Coordinates: {alertItem.latitude}, {alertItem.longitude}
                          </span>
                        </div>
                        <div className="text-xs text-safe-muted">
                          User ID: <code className="bg-gray-100 px-1 rounded">{alertItem.user_id}</code>
                        </div>
                      </div>

                      {/* Map Preview */}
                      <div className="h-40 w-full rounded-lg overflow-hidden border border-gray-200 mb-4 z-0">
                        <MapContainer
                          center={[alertItem.latitude, alertItem.longitude]}
                          zoom={13}
                          scrollWheelZoom={false}
                          className="h-full w-full"
                        >
                          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                          <Marker position={[alertItem.latitude, alertItem.longitude]}>
                            <Popup>SOS Location</Popup>
                          </Marker>
                        </MapContainer>
                      </div>
                    </div>

                    <button
                      onClick={() => handleAcceptAlert(alertItem.id)}
                      disabled={acceptingId === alertItem.id}
                      className="w-full py-2.5 bg-safe-purple text-white font-bold rounded-lg shadow hover:bg-safe-purple-tint transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                    >
                      <UserCheck className="w-5 h-5" />
                      <span>{acceptingId === alertItem.id ? 'Accepting...' : 'Accept Emergency Response'}</span>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Responded Alerts List */}
            {respondedAlerts.length > 0 && (
              <div className="mt-8 space-y-4">
                <h3 className="font-bold text-safe-ink text-lg">Alerts You Responded To</h3>
                <div className="space-y-3">
                  {respondedAlerts.map((rAlert) => (
                    <div
                      key={rAlert.id}
                      className="bg-white p-4 rounded-xl border border-gray-200 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          {/* Status Badge: Responded = Warning Amber */}
                          <span className="bg-safe-amber text-white text-xs px-2.5 py-0.5 rounded-full font-bold uppercase">
                            Responded
                          </span>
                          <span className="text-sm font-bold text-safe-ink">Alert ID: {rAlert.id}</span>
                        </div>
                        <div className="text-xs text-safe-muted mt-1">
                          Location: {rAlert.latitude}, {rAlert.longitude}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
