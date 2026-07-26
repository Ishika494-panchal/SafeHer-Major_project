import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, requiredRole }) {
  const { token, user } = useAuth();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return (
      <div className="min-h-screen bg-safe-bg flex flex-col items-center justify-center p-4">
        <div className="bg-white p-6 rounded-lg shadow-md max-w-md w-full text-center">
          <h2 className="text-xl font-bold text-safe-red mb-2">Access Denied</h2>
          <p className="text-safe-ink mb-4">
            This page requires the <strong>{requiredRole}</strong> role. Your current role is <strong>{user?.role}</strong>.
          </p>
          <a
            href="/dashboard"
            className="inline-block bg-safe-purple text-white px-4 py-2 rounded font-medium hover:bg-safe-purple-tint transition-colors"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return children;
}
