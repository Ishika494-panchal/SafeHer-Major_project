import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, User, Mail, Phone, Lock, FileText, Clock } from 'lucide-react';

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'woman',
    id_proof_url: '',
    availability: '',
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
      await signup(formData);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Signup failed');
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
          <h1 className="text-2xl font-bold text-safe-ink">Create SafeHer Account</h1>
          <p className="text-safe-muted text-sm mt-1">Join the safety network</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-safe-red text-safe-red text-sm rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-safe-ink uppercase mb-1">Full Name</label>
            <div className="relative">
              <User className="w-5 h-5 text-safe-muted absolute left-3 top-2.5" />
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="Jane Doe"
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-safe-ink text-sm focus:outline-none focus:border-safe-purple"
              />
            </div>
          </div>

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
            <label className="block text-xs font-semibold text-safe-ink uppercase mb-1">Phone Number</label>
            <div className="relative">
              <Phone className="w-5 h-5 text-safe-muted absolute left-3 top-2.5" />
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+1234567890"
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

          <div>
            <label className="block text-xs font-semibold text-safe-ink uppercase mb-2">I am registering as:</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, role: 'woman' })}
                className={`py-2 px-3 rounded-lg text-sm font-semibold border transition-all ${
                  formData.role === 'woman'
                    ? 'bg-safe-purple text-white border-safe-purple shadow'
                    : 'bg-white text-safe-ink border-gray-300 hover:bg-gray-50'
                }`}
              >
                Woman
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, role: 'volunteer' })}
                className={`py-2 px-3 rounded-lg text-sm font-semibold border transition-all ${
                  formData.role === 'volunteer'
                    ? 'bg-safe-green text-white border-safe-green shadow'
                    : 'bg-white text-safe-ink border-gray-300 hover:bg-gray-50'
                }`}
              >
                Volunteer
              </button>
            </div>
          </div>

          {formData.role === 'volunteer' && (
            <div className="space-y-4 pt-2 border-t border-gray-100 bg-green-50/50 p-3 rounded-lg border border-green-100">
              <h3 className="text-xs font-bold text-safe-green uppercase">Volunteer Profile Details</h3>

              <div>
                <label className="block text-xs font-semibold text-safe-ink uppercase mb-1">ID Proof URL (Optional)</label>
                <div className="relative">
                  <FileText className="w-5 h-5 text-safe-muted absolute left-3 top-2.5" />
                  <input
                    type="text"
                    name="id_proof_url"
                    value={formData.id_proof_url}
                    onChange={handleChange}
                    placeholder="https://example.com/id-proof.jpg"
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-safe-ink text-sm focus:outline-none focus:border-safe-green"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-safe-ink uppercase mb-1">Availability (Optional)</label>
                <div className="relative">
                  <Clock className="w-5 h-5 text-safe-muted absolute left-3 top-2.5" />
                  <input
                    type="text"
                    name="availability"
                    value={formData.availability}
                    onChange={handleChange}
                    placeholder="Weekdays 6 PM - 10 PM"
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-safe-ink text-sm focus:outline-none focus:border-safe-green"
                  />
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-safe-purple text-white font-bold rounded-lg shadow hover:bg-safe-purple-tint transition-all disabled:opacity-50 mt-4"
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <p className="text-center text-sm text-safe-muted mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-safe-purple-tint font-bold hover:underline">
            Log In
          </Link>
        </p>
      </div>
    </div>
  );
}
