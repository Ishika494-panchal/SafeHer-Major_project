import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, User, LogOut, PhoneCall } from 'lucide-react';

export default function Navbar() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();

  if (!token) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-safe-purple text-white shadow-md">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center space-x-2 font-bold text-xl hover:text-safe-purple-tint transition-colors">
          <Shield className="w-6 h-6 text-white" />
          <span>SafeHer</span>
        </Link>

        <div className="flex items-center space-x-6">
          <Link
            to="/dashboard"
            className="hover:text-safe-purple-tint transition-colors text-sm font-medium"
          >
            Dashboard
          </Link>

          {user?.role === 'woman' && (
            <Link
              to="/contacts"
              className="flex items-center space-x-1 hover:text-safe-purple-tint transition-colors text-sm font-medium"
            >
              <PhoneCall className="w-4 h-4" />
              <span>Emergency Contacts</span>
            </Link>
          )}

          <div className="flex items-center space-x-3 border-l border-white/20 pl-4">
            <div className="flex items-center space-x-2 text-sm">
              <User className="w-4 h-4" />
              <span className="font-semibold">{user?.name || user?.email}</span>
            </div>

            {user?.role === 'volunteer' ? (
              <span className="bg-safe-green text-white text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                Volunteer
              </span>
            ) : (
              <span className="bg-safe-purple-tint text-white text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                Woman
              </span>
            )}

            <button
              onClick={handleLogout}
              className="flex items-center space-x-1 text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
