import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  auth, 
  googleProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  signOut,
  onAuthStateChanged,
  isRealFirebaseConfigured 
} from '../firebase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [authToken, setAuthToken] = useState(localStorage.getItem('safeher_token') || 'dev-token-123');
  const [loading, setLoading] = useState(true);

  // Sync user profile with FastAPI backend
  const syncBackendUser = async (userObj, token) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id: userObj.uid || userObj.id || 'dev_user_123',
          name: userObj.displayName || userObj.name || userObj.email?.split('@')[0] || 'SafeHer User',
          email: userObj.email || 'user@safeher.app',
          phone: userObj.phoneNumber || userObj.phone || '+1-555-0199'
        })
      });
      if (response.ok) {
        const syncedData = await response.json();
        setCurrentUser(syncedData);
      } else {
        // Fallback to local profile
        setCurrentUser({
          id: userObj.uid || userObj.id || 'dev_user_123',
          name: userObj.displayName || userObj.name || 'SafeHer Guardian',
          email: userObj.email || 'user@safeher.app',
          phone: userObj.phone || '+1-555-0199'
        });
      }
    } catch (err) {
      console.warn("Backend sync notice (backend server might be starting):", err);
      setCurrentUser({
        id: userObj.uid || userObj.id || 'dev_user_123',
        name: userObj.displayName || userObj.name || 'SafeHer Guardian',
        email: userObj.email || 'user@safeher.app',
        phone: userObj.phone || '+1-555-0199'
      });
    }
  };

  useEffect(() => {
    if (isRealFirebaseConfigured) {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          const idToken = await user.getIdToken();
          setAuthToken(idToken);
          localStorage.setItem('safeher_token', idToken);
          await syncBackendUser(user, idToken);
        } else {
          setCurrentUser(null);
          setAuthToken(null);
          localStorage.removeItem('safeher_token');
        }
        setLoading(false);
      });
      return unsubscribe;
    } else {
      // Dev mode initialization: check stored session or default demo user
      const storedDevUser = localStorage.getItem('safeher_dev_user');
      if (storedDevUser) {
        try {
          const parsed = JSON.parse(storedDevUser);
          setCurrentUser(parsed);
          setAuthToken(`dev-token-${parsed.id}`);
        } catch {
          initDefaultDevUser();
        }
      } else {
        initDefaultDevUser();
      }
      setLoading(false);
    }
  }, []);

  const initDefaultDevUser = () => {
    const defaultUser = {
      id: 'dev_user_123',
      name: 'SafeHer Guardian',
      email: 'demo@safeher.app',
      phone: '+1-555-0199'
    };
    setCurrentUser(defaultUser);
    setAuthToken('dev-token-123');
    localStorage.setItem('safeher_dev_user', JSON.stringify(defaultUser));
  };

  // Sign In with Email & Password
  const login = async (email, password) => {
    if (isRealFirebaseConfigured) {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const token = await result.user.getIdToken();
      setAuthToken(token);
      localStorage.setItem('safeher_token', token);
      await syncBackendUser(result.user, token);
      return result.user;
    } else {
      // Dev mode login
      const devUser = {
        id: `dev_${Date.now()}`,
        name: email.split('@')[0],
        email: email,
        phone: '+1-555-0199'
      };
      setCurrentUser(devUser);
      setAuthToken(`dev-token-${devUser.id}`);
      localStorage.setItem('safeher_dev_user', JSON.stringify(devUser));
      await syncBackendUser(devUser, `dev-token-${devUser.id}`);
      return devUser;
    }
  };

  // Register with Email, Password & Name
  const register = async (name, email, password, phone) => {
    if (isRealFirebaseConfigured) {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const token = await result.user.getIdToken();
      setAuthToken(token);
      localStorage.setItem('safeher_token', token);
      const userObj = { ...result.user, displayName: name, phone };
      await syncBackendUser(userObj, token);
      return result.user;
    } else {
      const devUser = {
        id: `dev_${Date.now()}`,
        name: name || email.split('@')[0],
        email: email,
        phone: phone || '+1-555-0199'
      };
      setCurrentUser(devUser);
      setAuthToken(`dev-token-${devUser.id}`);
      localStorage.setItem('safeher_dev_user', JSON.stringify(devUser));
      await syncBackendUser(devUser, `dev-token-${devUser.id}`);
      return devUser;
    }
  };

  // Sign In with Google
  const loginWithGoogle = async () => {
    if (isRealFirebaseConfigured) {
      const result = await signInWithPopup(auth, googleProvider);
      const token = await result.user.getIdToken();
      setAuthToken(token);
      localStorage.setItem('safeher_token', token);
      await syncBackendUser(result.user, token);
      return result.user;
    } else {
      const devUser = {
        id: 'dev_google_user',
        name: 'Google SafeHer User',
        email: 'google.user@safeher.app',
        phone: '+1-555-0199'
      };
      setCurrentUser(devUser);
      setAuthToken('dev-token-google');
      localStorage.setItem('safeher_dev_user', JSON.stringify(devUser));
      await syncBackendUser(devUser, 'dev-token-google');
      return devUser;
    }
  };

  // Logout
  const logout = async () => {
    if (isRealFirebaseConfigured) {
      await signOut(auth);
    }
    setCurrentUser(null);
    setAuthToken(null);
    localStorage.removeItem('safeher_token');
    localStorage.removeItem('safeher_dev_user');
  };

  const value = {
    currentUser,
    authToken,
    loading,
    login,
    register,
    loginWithGoogle,
    logout,
    syncBackendUser
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
