import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Mail, Lock } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(formData.email, formData.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-safe-bg flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full border border-gray-100">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-safe-purple p-3 rounded-full text-white mb-2">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-safe-ink">Welcome Back</h1>
          <p className="text-safe-muted text-sm mt-1">Log in to SafeHer</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-safe-red text-safe-red text-sm rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-safe-ink uppercase mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-5 h-5 text-safe-muted absolute left-3 top-2.5" />
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="jane@example.com"
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-safe-ink text-sm focus:outline-none focus:border-safe-purple"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-safe-ink uppercase mb-1">Password</label>
            <div className="relative">
              <Lock className="w-5 h-5 text-safe-muted absolute left-3 top-2.5" />
              <input
                type="password"
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-safe-ink text-sm focus:outline-none focus:border-safe-purple"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-safe-purple text-white font-bold rounded-lg shadow hover:bg-safe-purple-tint transition-all disabled:opacity-50 mt-4"
          >
            {loading ? 'Logging In...' : 'Log In'}
          </button>
        </form>

        <p className="text-center text-sm text-safe-muted mt-6">
          Don't have an account?{' '}
          <Link to="/signup" className="text-safe-purple-tint font-bold hover:underline">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}
