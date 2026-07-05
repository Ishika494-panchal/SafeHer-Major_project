import { useState } from 'react';
import supabase from '../supabaseClient';
import './Auth.css';

function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sessionData, setSessionData] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSessionData(null);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
      } else {
        setSessionData(data.session);
        // Clear input fields
        setEmail('');
        setPassword('');
        // Log the access token as proof of login
        console.log('Login successful! Access token:', data.session.access_token);
        
        // Trigger parent callback if provided
        if (onLoginSuccess) {
          onLoginSuccess(data.session);
        }
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred during login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2 className="auth-title">Welcome Back</h2>
      <p className="auth-subtitle">Login to your SafeHer account</p>

      {error && <div className="message error">{error}</div>}
      {sessionData && (
        <div className="message success">
          Login successful! Authenticated session established.
          <div style={{ marginTop: '8px', fontSize: '12px', wordBreak: 'break-all' }}>
            <strong>Token acquired:</strong> {sessionData.access_token.substring(0, 20)}...
          </div>
        </div>
      )}

      <form className="auth-form" onSubmit={handleLogin}>
        <div className="form-group">
          <label htmlFor="email" className="form-label">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            className="form-input"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="password" className="form-label">
            Password
          </label>
          <input
            id="password"
            type="password"
            className="form-input"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <button type="submit" className="auth-button" disabled={loading}>
          {loading ? 'Logging in...' : 'Log In'}
        </button>
      </form>
    </div>
  );
}

export default Login;
