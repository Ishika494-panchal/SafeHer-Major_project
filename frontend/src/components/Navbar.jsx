import React, { useState, useEffect } from 'react';
import { Menu, X, Shield, ArrowRight, LayoutDashboard, Users, LogOut, User } from 'lucide-react';
import logoSvg from '../assets/logo.svg';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ currentTab, onSelectTab, onOpenAuth }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { currentUser, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
      scrolled 
        ? 'bg-white/90 backdrop-blur-md border-b border-purple-100/80 shadow-sm py-3' 
        : 'bg-transparent py-4'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          
          {/* LEFT: Brand Logo */}
          <div 
            className="flex items-center space-x-3 cursor-pointer" 
            onClick={() => onSelectTab('dashboard')}
          >
            <div className="relative group">
              <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#5B21B6] opacity-40 group-hover:opacity-80 blur transition duration-300"></div>
              <img 
                src={logoSvg} 
                alt="SafeHer Logo" 
                className="relative w-9 h-9 rounded-full shadow-md transform group-hover:scale-105 transition duration-300"
              />
            </div>
            <span className="text-2xl font-sora font-extrabold tracking-tight text-slate-900">
              SAFE<span className="text-[#7C3AED]">HER</span>
            </span>
          </div>

          {/* CENTER: App Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1 bg-purple-50/80 p-1.5 rounded-full border border-purple-100/80 backdrop-blur-sm">
            <button
              onClick={() => onSelectTab('dashboard')}
              className={`px-5 py-2 text-xs font-bold rounded-full transition flex items-center gap-1.5 ${
                currentTab === 'dashboard'
                  ? 'bg-[#7C3AED] text-white shadow-sm'
                  : 'text-slate-700 hover:text-[#7C3AED] hover:bg-purple-100/50'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Live Dashboard</span>
            </button>

            <button
              onClick={() => onSelectTab('contacts')}
              className={`px-5 py-2 text-xs font-bold rounded-full transition flex items-center gap-1.5 ${
                currentTab === 'contacts'
                  ? 'bg-[#7C3AED] text-white shadow-sm'
                  : 'text-slate-700 hover:text-[#7C3AED] hover:bg-purple-100/50'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Emergency Contacts</span>
            </button>

            <button
              onClick={() => onSelectTab('landing')}
              className={`px-5 py-2 text-xs font-bold rounded-full transition flex items-center gap-1.5 ${
                currentTab === 'landing'
                  ? 'bg-[#7C3AED] text-white shadow-sm'
                  : 'text-slate-700 hover:text-[#7C3AED] hover:bg-purple-100/50'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Overview</span>
            </button>
          </nav>

          {/* RIGHT: User Profile & Auth Actions */}
          <div className="hidden md:flex items-center space-x-3">
            {currentUser ? (
              <div className="flex items-center space-x-3 bg-purple-50/80 pl-3 pr-2 py-1.5 rounded-full border border-purple-100">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-full bg-[#7C3AED] text-white font-bold text-xs flex items-center justify-center">
                    {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="text-xs font-bold text-slate-800 max-w-[120px] truncate">
                    {currentUser.name}
                  </span>
                </div>
                
                <button
                  onClick={logout}
                  className="p-1.5 text-slate-500 hover:text-[#E11D48] hover:bg-rose-50 rounded-full transition"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <button 
                  onClick={() => onOpenAuth('login')}
                  className="px-5 py-2 text-xs font-bold text-[#7C3AED] hover:bg-purple-100/60 rounded-full transition"
                >
                  Sign In
                </button>

                <button 
                  onClick={() => onOpenAuth('register')}
                  className="group relative inline-flex items-center justify-center px-5 py-2 text-xs font-bold text-white bg-[#7C3AED] hover:bg-[#6D28D9] rounded-full shadow-glow-purple transition"
                >
                  <span className="flex items-center gap-1.5">
                    Get Started
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center">
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-700 hover:text-[#7C3AED] bg-purple-50 rounded-xl border border-purple-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white/95 backdrop-blur-xl border-b border-purple-100 px-4 pt-4 pb-6 mt-2 space-y-3 shadow-xl">
          <div className="flex flex-col space-y-1">
            <button
              onClick={() => { onSelectTab('dashboard'); setMobileMenuOpen(false); }}
              className="px-4 py-2.5 text-left text-sm font-bold text-slate-800 hover:bg-purple-50 rounded-xl"
            >
              Live Dashboard
            </button>
            <button
              onClick={() => { onSelectTab('contacts'); setMobileMenuOpen(false); }}
              className="px-4 py-2.5 text-left text-sm font-bold text-slate-800 hover:bg-purple-50 rounded-xl"
            >
              Emergency Contacts
            </button>
            <button
              onClick={() => { onSelectTab('landing'); setMobileMenuOpen(false); }}
              className="px-4 py-2.5 text-left text-sm font-bold text-slate-800 hover:bg-purple-50 rounded-xl"
            >
              Overview
            </button>
          </div>

          <div className="pt-3 border-t border-purple-100 flex flex-col space-y-2">
            {currentUser ? (
              <button 
                onClick={() => { logout(); setMobileMenuOpen(false); }}
                className="w-full py-2.5 text-center text-xs font-bold text-rose-600 bg-rose-50 rounded-xl"
              >
                Sign Out ({currentUser.name})
              </button>
            ) : (
              <>
                <button 
                  onClick={() => { setMobileMenuOpen(false); onOpenAuth('login'); }}
                  className="w-full py-2.5 text-center text-xs font-bold text-[#7C3AED] bg-purple-50 rounded-xl"
                >
                  Sign In
                </button>
                <button 
                  onClick={() => { setMobileMenuOpen(false); onOpenAuth('register'); }}
                  className="w-full py-2.5 text-center text-xs font-bold text-white bg-[#7C3AED] rounded-xl shadow-sm"
                >
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
