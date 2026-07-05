import { useState, useEffect } from 'react';
import supabase from '../supabaseClient';
import './Dashboard.css';

function Dashboard({ session }) {
  const user = session?.user;
  const token = session?.access_token;
  const email = user?.email || 'User';
  const initial = email.charAt(0).toUpperCase();

  const [backendData, setBackendData] = useState(null);
  const [loadingBackend, setLoadingBackend] = useState(false);
  const [backendError, setBackendError] = useState(null);

  // Fetch verified data from the FastAPI backend
  useEffect(() => {
    if (!token) return;

    const ports = [8000, 8081];

    const fetchBackendData = async () => {
      setLoadingBackend(true);
      setBackendError(null);

      let success = false;
      let lastErrorMsg = '';

      for (const port of ports) {
        try {
          // First, call /debug-token to inspect raw JWT claims
          const debugRes = await fetch(`http://localhost:${port}/debug-token`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (debugRes.ok) {
            const debugData = await debugRes.json();
            console.log(`[Port ${port}] Raw JWT Claims:`, debugData);
          }

          // Now call the protected /me endpoint
          const response = await fetch(`http://localhost:${port}/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (response.ok) {
            const data = await response.json();
            setBackendData(data);
            success = true;
            break;
          } else {
            const errBody = await response.json().catch(() => ({}));
            lastErrorMsg = `Server at ${port} returned status ${response.status}: ${errBody.detail || ''}`;
            console.error(`[Port ${port}] /me error:`, errBody);
          }
        } catch (err) {
          lastErrorMsg = err.message || `Failed to connect to port ${port}`;
          console.error(`[Port ${port}] Connection error:`, err);
        }
      }

      if (!success) {
        setBackendError(lastErrorMsg || 'Could not connect to FastAPI server.');
      } else {
        setBackendError(null);
      }
      setLoadingBackend(false);
    };

    fetchBackendData();
  }, [token]);


  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error logging out:', error.message);
      }
    } catch (err) {
      console.error('Unexpected logout error:', err);
    }
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="dashboard-title-area">
          <h2 className="dashboard-title">SafeHer Dashboard</h2>
          <p className="dashboard-subtitle">Your personal safety control panel</p>
        </div>
        <button type="button" className="logout-button" onClick={handleLogout}>
          Log Out
        </button>
      </header>

      <section className="profile-card">
        <div className="profile-avatar">{initial}</div>
        <div className="profile-details">
          <div className="profile-email">{email}</div>
          <div className="profile-id">ID: {user?.id || 'Unknown User'}</div>
        </div>
      </section>

      {/* FastAPI Verification Status */}
      <section style={{ marginBottom: '30px', padding: '20px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg)' }}>
        <h3 style={{ margin: '0 0 12px 0', color: 'var(--text-h)', fontSize: '18px', fontWeight: '600' }}>FastAPI Backend Verification</h3>
        
        {loadingBackend && (
          <p style={{ color: 'var(--text)', margin: 0, fontSize: '14px' }}>Connecting to FastAPI server and verifying auth token...</p>
        )}
        
        {backendError && (
          <div style={{ color: '#dc2626', background: 'rgba(220, 38, 38, 0.08)', border: '1px solid rgba(220, 38, 38, 0.15)', padding: '12px', borderRadius: '6px', fontSize: '14px' }}>
            Could not verify token with backend: <strong>{backendError}</strong>. 
            <div style={{ marginTop: '4px', fontSize: '12px', color: 'var(--text)' }}>
              Make sure your FastAPI server is running on <code style={{ fontSize: '11px' }}>http://localhost:8000</code>.
            </div>
          </div>
        )}

        {backendData && (
          <div style={{ background: 'rgba(22, 163, 74, 0.08)', border: '1px solid rgba(22, 163, 74, 0.15)', padding: '15px', borderRadius: '6px', color: '#16a34a' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', fontSize: '15px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              Backend Token Verification Succeeded!
            </div>
            <pre style={{ margin: '12px 0 0 0', padding: '10px', background: 'var(--code-bg)', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '12px', color: 'var(--text-h)', overflowX: 'auto', textAlign: 'left', fontFamily: 'var(--mono)' }}>
              {JSON.stringify(backendData, null, 2)}
            </pre>
          </div>
        )}
      </section>

      <section>
        <h3 style={{ margin: '0 0 16px 0', color: 'var(--text-h)', fontSize: '18px', fontWeight: '600' }}>Application Placeholders</h3>
        <div className="dashboard-grid">
          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <h4 className="feature-title">SOS Shield</h4>
            <p className="feature-desc">Instantly trigger alerts to emergency services and your trusted safety network.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <h4 className="feature-title">Safe Route Map</h4>
            <p className="feature-desc">Navigate paths monitored by real-time safety scores and community reports.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <h4 className="feature-title">Safety Circle</h4>
            <p className="feature-desc">Add and manage trusted contacts who will receive emergency coordinates.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Dashboard;
