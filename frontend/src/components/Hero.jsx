import React, { useState } from 'react';
import { 
  ShieldCheck, 
  AlertCircle, 
  Radio, 
  Users, 
  MapPin, 
  ChevronRight, 
  BellRing, 
  Sparkles, 
  CheckCircle2,
  Lock,
  Smartphone,
  Volume2,
  Zap,
  Activity,
  HeartHandshake,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Hero({ onOpenSos, onGetStarted, onOpenContacts }) {
  const [sosActive, setSosActive] = useState(false);
  const { currentUser } = useAuth();

  const handleSosClick = () => {
    setSosActive(true);
    if (onOpenSos) onOpenSos();
    setTimeout(() => setSosActive(false), 3000);
  };

  return (
    <div className="space-y-24 py-6">
      
      {/* HERO SECTION */}
      <section className="relative overflow-hidden">
        {/* Radial Background Blur Glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-gradient-to-tr from-purple-300/30 via-[#7C3AED]/10 to-transparent rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* LEFT COLUMN: Headlines & Actions */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              
              {/* Status Pill */}
              <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200 text-[#10B981] text-xs font-bold uppercase tracking-wider shadow-xs">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#10B981]"></span>
                </span>
                Safe & Protected Network Active
              </div>

              {/* Main Title */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-sora font-extrabold text-slate-900 tracking-tight leading-[1.12]">
                Empowering Safety with Instant <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#7C3AED] via-[#6D28D9] to-purple-800">Guardian Protection</span>
              </h1>

              {/* Subtext */}
              <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto lg:mx-0 font-normal leading-relaxed">
                SafeHer connects you with verified emergency responders and loved ones in milliseconds. One tap dispatches live location, audio evidence, and silent distress signals.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                {/* Launch Live Dashboard Button */}
                <button
                  onClick={onOpenSos}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 text-base font-bold text-white bg-[#7C3AED] hover:bg-[#6D28D9] rounded-full shadow-glow-purple transition-all duration-300 transform hover:-translate-y-0.5"
                >
                  <Activity className="w-5 h-5" />
                  <span>{currentUser ? 'Go to Live Protection Dashboard' : 'Launch Live Protection Dashboard'}</span>
                </button>

                {/* Test Emergency SOS or Get Started */}
                {currentUser ? (
                  <button
                    onClick={handleSosClick}
                    className="w-full sm:w-auto group relative inline-flex items-center justify-center gap-2.5 px-7 py-3.5 text-base font-bold text-white bg-[#E11D48] hover:bg-rose-700 rounded-full shadow-glow-sos hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
                  >
                    <BellRing className={`w-5 h-5 ${sosActive ? 'animate-bounce' : 'animate-pulse'}`} />
                    <span>{sosActive ? 'SOS Alert Dispatched!' : 'Test Hold SOS'}</span>
                  </button>
                ) : (
                  <button
                    onClick={onGetStarted}
                    className="w-full sm:w-auto group relative inline-flex items-center justify-center gap-2.5 px-7 py-3.5 text-base font-bold text-[#7C3AED] bg-purple-100 hover:bg-purple-200 rounded-full transition-all duration-300 transform hover:-translate-y-0.5"
                  >
                    <span>Get Started Free</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                )}
              </div>

              {/* Trust Statistics Strip */}
              <div className="pt-6 grid grid-cols-3 gap-4 border-t border-purple-100/80 max-w-lg mx-auto lg:mx-0">
                <div>
                  <p className="text-2xl font-sora font-extrabold text-[#7C3AED]">&lt; 1.8s</p>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">SOS Latency</p>
                </div>
                <div>
                  <p className="text-2xl font-sora font-extrabold text-[#7C3AED]">100%</p>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Encrypted GPS</p>
                </div>
                <div>
                  <p className="text-2xl font-sora font-extrabold text-[#10B981]">24 / 7</p>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Active Guard</p>
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: Interactive Live App Mockup Card */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-purple-100">
                
                {/* Card Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-[#7C3AED] font-sora font-bold text-sm">
                      SH
                    </div>
                    <div>
                      <h3 className="font-sora font-bold text-slate-900 text-sm">Live Guardian Shield</h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#7C3AED]" /> Downtown Safe Route
                      </p>
                    </div>
                  </div>
                  
                  {/* Safe Status pill */}
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-[#10B981] text-xs font-bold">
                    <ShieldCheck className="w-3.5 h-3.5" /> Protected
                  </span>
                </div>

                {/* Map Graphic Simulation */}
                <div className="my-5 relative h-48 rounded-2xl bg-slate-900 overflow-hidden border border-slate-200 shadow-inner">
                  <div className="absolute inset-0 bg-cover bg-center opacity-40 bg-[radial-gradient(#7c3aed_1.5px,transparent_1.5px)] [background-size:16px_16px]"></div>
                  
                  {/* Animated pulse user location marker */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                    <span className="relative flex h-8 w-8 items-center justify-center">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#7C3AED] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-5 w-5 bg-[#7C3AED] border-2 border-white shadow-lg"></span>
                    </span>
                    <span className="mt-1.5 px-2.5 py-0.5 bg-white/90 backdrop-blur-md text-[10px] font-bold text-slate-800 rounded-md shadow-md">
                      You (Active Protection)
                    </span>
                  </div>

                  {/* Safe corridor overlay */}
                  <div className="absolute bottom-3 left-3 right-3 bg-white/90 backdrop-blur-md p-2.5 rounded-xl flex items-center justify-between text-xs shadow-sm">
                    <div className="flex items-center gap-2">
                      <Radio className="w-4 h-4 text-[#10B981] animate-pulse" />
                      <span className="font-semibold text-slate-700">Safe Corridor Verified</span>
                    </div>
                    <span className="font-bold text-[#7C3AED]">3 Guardians Online</span>
                  </div>
                </div>

                {/* Quick Actions inside Card */}
                <div className="space-y-3">
                  <div className="p-3 bg-purple-50/80 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#7C3AED] text-white rounded-lg">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">Trusted Contacts</p>
                        <p className="text-[11px] text-slate-500">Mom, Maya, Campus Security</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[#10B981] bg-white px-2.5 py-1 rounded-md shadow-xs flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Linked
                    </span>
                  </div>

                  {/* Simulated Emergency Trigger inside Card */}
                  <button
                    onClick={handleSosClick}
                    className={`w-full py-3 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition ${
                      sosActive ? 'bg-[#10B981]' : 'bg-[#E11D48] hover:bg-rose-700'
                    }`}
                  >
                    <AlertCircle className="w-4 h-4" />
                    {sosActive ? 'Emergency Signal Active!' : 'Hold 2 Seconds for SOS Broadcast'}
                  </button>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>


      {/* FEATURES SECTION */}
      <section id="features" className="space-y-10 pt-8 border-t border-purple-100">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[#7C3AED] bg-purple-100 px-3.5 py-1 rounded-full">
            Core Safety Architecture
          </span>
          <h2 className="text-3xl sm:text-4xl font-sora font-extrabold text-slate-900">
            Intelligent Features Engineered for Instant Response
          </h2>
          <p className="text-sm text-slate-600">
            SafeHer integrates real-time GPS geolocation, encrypted emergency contact notifications, and silent distress dispatch into one unified system.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Feature 1 */}
          <div className="bg-white rounded-3xl p-6 border border-purple-100 shadow-sm hover:shadow-md transition space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 text-[#7C3AED] flex items-center justify-center font-bold">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-sora font-bold text-slate-900">Sub-2 Second SOS Trigger</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Hold the distress button for 2 seconds to launch instant alerts. Geolocation coordinates round-trip to backend servers in milliseconds.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white rounded-3xl p-6 border border-purple-100 shadow-sm hover:shadow-md transition space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-[#E11D48] flex items-center justify-center font-bold">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <h3 className="text-lg font-sora font-bold text-slate-900">Live GPS Location Streaming</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              When an SOS alert is active, browser location pings auto-stream every 5 seconds to your live tracking map and emergency contact circle.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white rounded-3xl p-6 border border-purple-100 shadow-sm hover:shadow-md transition space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-[#10B981] flex items-center justify-center font-bold">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-sora font-bold text-slate-900">Guardians Circle Management</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Easily manage your trusted contacts (parents, partners, friends, security). Instant phone calling and location link dispatch.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-white rounded-3xl p-6 border border-purple-100 shadow-sm hover:shadow-md transition space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 text-[#7C3AED] flex items-center justify-center font-bold">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-sora font-bold text-slate-900">Firebase & Encrypted Auth</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Secure authentication via Firebase email/password or Google OAuth. Protected routes and token verification ensure absolute privacy.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="bg-white rounded-3xl p-6 border border-purple-100 shadow-sm hover:shadow-md transition space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
              <Smartphone className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-sora font-bold text-slate-900">Responsive Mobile Web App</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Optimized for mobile browsers with touch gesture hold actions, geolocation API access, battery level monitoring, and high-contrast UI.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="bg-white rounded-3xl p-6 border border-purple-100 shadow-sm hover:shadow-md transition space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-[#10B981] flex items-center justify-center font-bold">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-sora font-bold text-slate-900">AWS SNS & SMS Ready</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Backend event triggers logging dispatch events ready for AWS SNS/SMS integration and real emergency responder routing.
            </p>
          </div>

        </div>
      </section>


      {/* HOW IT WORKS SECTION */}
      <section id="how-it-works" className="space-y-10 pt-8 border-t border-purple-100">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[#7C3AED] bg-purple-100 px-3.5 py-1 rounded-full">
            Simple 3-Step Process
          </span>
          <h2 className="text-3xl sm:text-4xl font-sora font-extrabold text-slate-900">
            How SafeHer Keeps You Protected
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          
          {/* Step 1 */}
          <div className="bg-white rounded-3xl p-7 border border-purple-100 shadow-sm text-center space-y-3 relative">
            <div className="w-10 h-10 rounded-full bg-[#7C3AED] text-white font-sora font-extrabold text-sm flex items-center justify-center mx-auto shadow-md">
              1
            </div>
            <h3 className="font-sora font-bold text-slate-900 text-base">Setup Guardian Network</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Create your account and add your trusted emergency contacts (parents, friends, guardians) with phone numbers.
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-white rounded-3xl p-7 border border-purple-100 shadow-sm text-center space-y-3 relative">
            <div className="w-10 h-10 rounded-full bg-[#E11D48] text-white font-sora font-extrabold text-sm flex items-center justify-center mx-auto shadow-md">
              2
            </div>
            <h3 className="font-sora font-bold text-slate-900 text-base">Hold SOS Button</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              In any emergency or unsafe situation, press and hold the SOS button for 2 seconds to initiate distress broadcast.
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-white rounded-3xl p-7 border border-purple-100 shadow-sm text-center space-y-3 relative">
            <div className="w-10 h-10 rounded-full bg-[#10B981] text-white font-sora font-extrabold text-sm flex items-center justify-center mx-auto shadow-md">
              3
            </div>
            <h3 className="font-sora font-bold text-slate-900 text-base">Live GPS Broadcast</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Your real-time GPS location streams every 5 seconds onto an interactive Leaflet map accessible by your guardians.
            </p>
          </div>

        </div>
      </section>


      {/* BOTTOM CALL TO ACTION BANNER */}
      <section className="bg-gradient-to-r from-[#7C3AED] via-[#6D28D9] to-[#5B21B6] rounded-3xl p-8 sm:p-12 text-white text-center space-y-6 shadow-xl relative overflow-hidden">
        <div className="max-w-2xl mx-auto space-y-3 relative z-10">
          <h2 className="text-3xl sm:text-4xl font-sora font-extrabold">
            Ready to Protect Yourself & Your Loved Ones?
          </h2>
          <p className="text-sm text-purple-100 leading-relaxed">
            Join the SafeHer emergency network today. Setup your trusted guardians and activate instant sub-2 second SOS protection.
          </p>
          
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onOpenSos}
              className="w-full sm:w-auto px-8 py-3.5 bg-white text-[#7C3AED] hover:bg-purple-50 font-bold text-sm rounded-full shadow-md transition"
            >
              {currentUser ? 'Go to Live Dashboard' : 'Open Live Dashboard'}
            </button>
            {currentUser ? (
              <button
                onClick={onOpenContacts}
                className="w-full sm:w-auto px-8 py-3.5 bg-purple-900/60 hover:bg-purple-900/80 text-white font-bold text-sm rounded-full border border-purple-300/40 transition"
              >
                Manage Emergency Contacts
              </button>
            ) : (
              <button
                onClick={onGetStarted}
                className="w-full sm:w-auto px-8 py-3.5 bg-[#E11D48] hover:bg-rose-700 text-white font-bold text-sm rounded-full shadow-glow-sos transition"
              >
                Create Account
              </button>
            )}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="pt-8 border-t border-purple-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
        <p>© 2026 SafeHer Platform. Empowering Women's Safety with AI & Guardian Networks.</p>
        <div className="flex items-center space-x-6 font-semibold">
          <a href="#features" className="hover:text-[#7C3AED]">Features</a>
          <a href="#how-it-works" className="hover:text-[#7C3AED]">How It Works</a>
          <span className="text-[#10B981]">Encrypted GPS Network</span>
        </div>
      </footer>

    </div>
  );
}
