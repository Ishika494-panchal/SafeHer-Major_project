import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Dashboard from './components/Dashboard';
import EmergencyContacts from './components/EmergencyContacts';
import AuthModal from './components/AuthModal';
import ReportModal from './components/ReportModal';
import AdminPanel from './components/AdminPanel';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function MainApp() {
  const { currentUser, authToken } = useAuth();
  const [currentTab, setCurrentTab] = useState('landing');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [reportModalOpen, setReportModalOpen] = useState(false);
  
  // Contacts state synced across components
  const [contacts, setContacts] = useState([
    { id: '1', name: 'Mom', phone: '+1 555-0123', relationship: 'Parent' },
    { id: '2', name: 'Maya Lin', phone: '+1 555-0188', relationship: 'Best Friend' },
    { id: '3', name: 'Campus Safety Officer', phone: '+1 555-0199', relationship: 'Guardian' }
  ]);

  // When user logs out, redirect to Overview landing page
  useEffect(() => {
    if (!currentUser && currentTab !== 'landing') {
      setCurrentTab('landing');
    }
  }, [currentUser]);

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
    if ((tab === 'dashboard' || tab === 'contacts' || tab === 'admin') && !currentUser) {
      handleOpenAuth('login');
      return;
    }
    setCurrentTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAuthSuccess = () => {
    setCurrentTab('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#F5F3FF] text-slate-900 font-sans selection:bg-[#7C3AED] selection:text-white flex flex-col">
      {/* Navbar Header */}
      <Navbar 
        currentTab={currentTab} 
        onSelectTab={handleSelectTab} 
        onOpenAuth={handleOpenAuth} 
        onOpenReportModal={() => setReportModalOpen(true)}
      />

      {/* Main App Content View */}
      <main className="flex-1 pt-24 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        {currentTab === 'dashboard' && (
          <Dashboard 
            contacts={contacts} 
            onNavigateToContacts={() => handleSelectTab('contacts')} 
            onOpenReportModal={() => setReportModalOpen(true)}
          />
        )}

        {currentTab === 'contacts' && (
          <EmergencyContacts 
            contacts={contacts} 
            onContactsUpdated={(newContacts) => setContacts(newContacts)} 
          />
        )}

        {currentTab === 'admin' && (
          <AdminPanel 
            onReportStatusChanged={() => {}}
          />
        )}

        {currentTab === 'landing' && (
          <Hero 
            onOpenSos={() => handleSelectTab('dashboard')}
            onGetStarted={() => handleOpenAuth('register')}
            onOpenContacts={() => handleSelectTab('contacts')}
          />
        )}
      </main>

      {/* Auth Modal (Sign In / Register) */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
        initialMode={authMode}
      />

      {/* Anonymous Incident Reporting Modal */}
      <ReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        userLocation={null}
        onReportSubmitted={() => {
          // Heatmap will re-poll on next interval or upon moderation approval
        }}
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

