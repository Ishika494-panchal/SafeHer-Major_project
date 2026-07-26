import React, { createContext, useContext, useState } from 'react';
import { apiCall } from '../api/client';

const AuthContext = createContext(null);

function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export function AuthProvider({ children }) {
  // TODO: Store token in secure storage (e.g. HttpOnly cookies or encrypted storage) for production persistence.
  // For now, storing in React memory state keeps the architecture minimal and easy to walk through in a viva.
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);

  const login = async (email, password) => {
    const data = await apiCall('/auth/login', {
      method: 'POST',
      body: { email, password },
    });

    const jwtPayload = parseJwt(data.token);
    setToken(data.token);
    setUser({
      id: jwtPayload?.user_id || data.user?.id,
      role: jwtPayload?.role || data.user?.role || 'woman',
      email: data.user?.email || email,
      name: data.user?.name || 'User',
    });

    return data;
  };

  const signup = async (formData) => {
    const data = await apiCall('/auth/signup', {
      method: 'POST',
      body: formData,
    });

    const jwtPayload = parseJwt(data.token);
    setToken(data.token);
    setUser({
      id: data.user?.id || jwtPayload?.user_id,
      role: data.user?.role || jwtPayload?.role || 'woman',
      email: data.user?.email,
      name: data.user?.name,
    });

    return data;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
