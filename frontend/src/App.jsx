import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Dashboard from './components/Dashboard';
import EmergencyContacts from './components/EmergencyContacts';
import AuthModal from './components/AuthModal';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function MainApp() {
  const { currentUser, authToken } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  
  // Contacts state synced across components
  const [contacts, setContacts] = useState([
    { id: '1', name: 'Mom', phone: '+1 555-0123', relationship: 'Parent' },
    { id: '2', name: 'Maya Lin', phone: '+1 555-0188', relationship: 'Best Friend' },
    { id: '3', name: 'Campus Safety Officer', phone: '+1 555-0199', relationship: 'Guardian' }
  ]);

  // Fetch real contacts from backend when user token is present
  useEffect(() => {
    if (authToken) {
      fetch(`${API_BASE_URL}/contacts/`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data.length > 0) {
            setContacts(data);
          }
        })
        .catch(() => {});
    }
  }, [authToken]);

  const handleOpenAuth = (mode = 'login') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const handleSelectTab = (tab) => {
    if ((tab === 'dashboard' || tab === 'contacts') && !currentUser) {
      handleOpenAuth('login');
      return;
    }
    setCurrentTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#F5F3FF] text-slate-900 font-sans selection:bg-[#7C3AED] selection:text-white flex flex-col">
      {/* Navbar Header */}
      <Navbar 
        currentTab={currentTab} 
        onSelectTab={handleSelectTab} 
        onOpenAuth={handleOpenAuth} 
      />

      {/* Main App Content View */}
      <main className="flex-1 pt-24 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        {currentTab === 'dashboard' && (
          <Dashboard 
            contacts={contacts} 
            onNavigateToContacts={() => handleSelectTab('contacts')} 
          />
        )}

        {currentTab === 'contacts' && (
          <EmergencyContacts 
            contacts={contacts} 
            onContactsUpdated={(newContacts) => setContacts(newContacts)} 
          />
        )}

        {currentTab === 'landing' && (
          <Hero 
            onOpenSos={() => handleSelectTab('dashboard')}
            onGetStarted={() => handleOpenAuth('register')}
          />
        )}
      </main>

      {/* Auth Modal (Sign In / Register) */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
