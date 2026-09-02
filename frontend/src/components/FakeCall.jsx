import React, { useState, useEffect, useRef } from 'react';
import { 
  Phone, 
  PhoneOff, 
  PhoneIncoming, 
  PhoneCall, 
  Clock, 
  User, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Grid, 
  Plus, 
  Video, 
  MessageSquare, 
  Bell, 
  X
} from 'lucide-react';

/**
 * Default Preset Callers with realistic names, titles and avatar images
 */
const PRESET_CALLERS = [
  {
    id: 'mom',
    name: 'Mom ❤️',
    subtitle: 'Mobile',
    phone: '+1 (555) 012-3456',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    voiceLine: "Hey honey! Where are you right now? I'm waiting for you right outside in the car. Hurry up and come over, okay? See you in two minutes!"
  },
  {
    id: 'dad',
    name: 'Dad',
    subtitle: 'Mobile',
    phone: '+1 (555) 018-9922',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    voiceLine: "Hello! I'm parked just around the corner. Are you walking over now? Stay on the phone with me until you get in the car."
  },
  {
    id: 'police',
    name: 'Campus Safety / Police',
    subtitle: 'Emergency Dispatch',
    phone: 'Safety Escort Desk',
    avatar: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=150&auto=format&fit=crop&q=80',
    voiceLine: "SafeHer Safety Control dispatch. We are confirming your live location corridor. An escort officer is on standby near your sector."
  },
  {
    id: 'boss',
    name: 'Work / Manager',
    subtitle: 'Work Phone',
    phone: '+1 (555) 019-8833',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    voiceLine: "Hi, sorry to call so late, but we have an urgent question about the project files. Could you check your laptop right away?"
  },
  {
    id: 'friend',
    name: 'Alex (Best Friend)',
    subtitle: 'Mobile',
    phone: '+1 (555) 014-7711',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    voiceLine: "Hey girl! I'm waving at you across the street, do you see me? I'm coming over right now!"
  }
];

const DELAY_OPTIONS = [
  { label: '5s (Quick)', value: 5 },
  { label: '10s', value: 10 },
  { label: '30s', value: 30 },
  { label: '1 min', value: 60 },
  { label: '3 min', value: 180 }
];

export default function FakeCall({ triggerButtonClass = '' }) {
  // Config state
  const [selectedCaller, setSelectedCaller] = useState(PRESET_CALLERS[0]);
  const [customName, setCustomName] = useState('');
  const [customPhone, setCustomPhone] = useState('');
  const [customAvatar, setCustomAvatar] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [delaySeconds, setDelaySeconds] = useState(10);
  const [customVoiceLine, setCustomVoiceLine] = useState('');

  // Execution states: 'idle' | 'scheduled' | 'ringing' | 'in_call'
  const [callState, setCallState] = useState('idle');
  const [remainingCountdown, setRemainingCountdown] = useState(0);
  const [callDuration, setCallDuration] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // In-call UI toggles
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);

  // Audio & Timer Refs
  const countdownTimerRef = useRef(null);
  const triggerTimeoutRef = useRef(null);
  const callDurationIntervalRef = useRef(null);
  const ringtoneAudioContextRef = useRef(null);
  const ringtoneOscillatorIntervalRef = useRef(null);
  const vibrationIntervalRef = useRef(null);
  const externalAudioRef = useRef(null);
  const inCallAudioRef = useRef(null);

  // Active caller object (either preset or custom)
  const activeCaller = isCustom ? {
    name: customName.trim() || 'Incoming Caller',
    subtitle: 'Mobile',
    phone: customPhone.trim() || '+1 (555) 000-0000',
    avatar: customAvatar.trim() || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    voiceLine: customVoiceLine.trim() || "Hello! Where are you? I'm waiting for you outside right now!"
  } : selectedCaller;

  // ---------------------------------------------------------------------------
  // Web Audio API Ringtone Generator (Fallback if no external MP3 is supplied)
  // Generates a realistic digital dual-tone phone chime
  // ---------------------------------------------------------------------------
  const startRealisticRingtone = () => {
    try {
      // Try playing external audio element first if a custom ringtone src is configured
      if (externalAudioRef.current && externalAudioRef.current.src) {
        externalAudioRef.current.play().catch(() => {});
      }

      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      const ctx = new AudioContext();
      ringtoneAudioContextRef.current = ctx;

      const playChimePattern = () => {
        if (!ringtoneAudioContextRef.current || ringtoneAudioContextRef.current.state === 'closed') return;
        
        // Classic phone ring tones (440Hz + 480Hz dual cadence)
        const notes = [
          { freq1: 440, freq2: 480, duration: 0.35, delay: 0 },
          { freq1: 440, freq2: 480, duration: 0.35, delay: 0.45 },
          { freq1: 523, freq2: 659, duration: 0.45, delay: 1.0 },
          { freq1: 659, freq2: 784, duration: 0.55, delay: 1.55 }
        ];

        notes.forEach(({ freq1, freq2, duration, delay }) => {
          const startTime = ctx.currentTime + delay;
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();

          osc1.type = 'sine';
          osc2.type = 'triangle';
          osc1.frequency.setValueAtTime(freq1, startTime);
          osc2.frequency.setValueAtTime(freq2, startTime);

          // Smooth envelope
          gain.gain.setValueAtTime(0.001, startTime);
          gain.gain.exponentialRampToValueAtTime(0.18, startTime + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);

          osc1.start(startTime);
          osc2.start(startTime);
          osc1.stop(startTime + duration);
          osc2.stop(startTime + duration);
        });
      };

      // Play immediately and repeat every 3 seconds
      playChimePattern();
      ringtoneOscillatorIntervalRef.current = setInterval(playChimePattern, 2800);

    } catch (err) {
      console.warn("AudioContext error during ringtone:", err);
    }
  };

  const stopRingtone = () => {
    // Stop Web Audio synthesizer
    if (ringtoneOscillatorIntervalRef.current) {
      clearInterval(ringtoneOscillatorIntervalRef.current);
      ringtoneOscillatorIntervalRef.current = null;
    }
    if (ringtoneAudioContextRef.current) {
      try {
        ringtoneAudioContextRef.current.close();
      } catch (e) {}
      ringtoneAudioContextRef.current = null;
    }

    // Stop external audio if playing
    if (externalAudioRef.current) {
      try {
        externalAudioRef.current.pause();
        externalAudioRef.current.currentTime = 0;
      } catch (e) {}
    }
  };

  // ---------------------------------------------------------------------------
  // Mobile Vibration API support
  // ---------------------------------------------------------------------------
  const startVibration = () => {
    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate([500, 250, 500, 250, 500]);
        vibrationIntervalRef.current = setInterval(() => {
          navigator.vibrate([500, 250, 500, 250, 500]);
        }, 2500);
      } catch (e) {}
    }
  };

  const stopVibration = () => {
    if (vibrationIntervalRef.current) {
      clearInterval(vibrationIntervalRef.current);
      vibrationIntervalRef.current = null;
    }
    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(0);
      } catch (e) {}
    }
  };

  // ---------------------------------------------------------------------------
  // In-Call Voice Simulator (SpeechSynthesis API)
  // Speaks realistic lines into the earpiece so bystander hears a conversation
  // ---------------------------------------------------------------------------
  const playInCallVoice = (text) => {
    // If an external in-call audio clip element exists and has source, play that
    if (inCallAudioRef.current && inCallAudioRef.current.src) {
      inCallAudioRef.current.play().catch(() => {});
      return;
    }

    if ('speechSynthesis' in window && text) {
      try {
        window.speechSynthesis.cancel();
        // Give 0.8s pause after answering like real calls
        setTimeout(() => {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 1.0;
          utterance.pitch = 1.05;
          utterance.volume = 1.0;
          window.speechSynthesis.speak(utterance);
        }, 800);
      } catch (e) {}
    }
  };

  const stopInCallVoice = () => {
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
    if (inCallAudioRef.current) {
      try {
        inCallAudioRef.current.pause();
        inCallAudioRef.current.currentTime = 0;
      } catch (e) {}
    }
  };

  // ---------------------------------------------------------------------------
  // Schedule Fake Call Trigger
  // ---------------------------------------------------------------------------
  const handleStartFakeCall = () => {
    setIsSettingsOpen(false);
    setCallState('scheduled');
    setRemainingCountdown(delaySeconds);

    // Decrement countdown badge every second
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    countdownTimerRef.current = setInterval(() => {
      setRemainingCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Timeout to launch the incoming call
    if (triggerTimeoutRef.current) clearTimeout(triggerTimeoutRef.current);
    triggerTimeoutRef.current = setTimeout(() => {
      triggerIncomingCall();
    }, delaySeconds * 1000);
  };

  // Cancel scheduled call
  const handleCancelScheduled = () => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    if (triggerTimeoutRef.current) clearTimeout(triggerTimeoutRef.current);
    setCallState('idle');
    setRemainingCountdown(0);
  };

  // Trigger Incoming Call Overlay
  const triggerIncomingCall = () => {
    setCallState('ringing');
    startRealisticRingtone();
    startVibration();
  };

  // Accept Call
  const handleAcceptCall = () => {
    stopRingtone();
    stopVibration();
    setCallState('in_call');
    setCallDuration(0);

    // Start in-call counter
    callDurationIntervalRef.current = setInterval(() => {
      setCallDuration(d => d + 1);
    }, 1000);

    // Play in-call voice script
    playInCallVoice(activeCaller.voiceLine);
  };

  // Decline Call
  const handleDeclineCall = () => {
    stopRingtone();
    stopVibration();
    stopInCallVoice();
    resetAllCallState();
  };

  // End Call
  const handleEndCall = () => {
    stopInCallVoice();
    resetAllCallState();
  };

  // Reset helper
  const resetAllCallState = () => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    if (triggerTimeoutRef.current) clearTimeout(triggerTimeoutRef.current);
    if (callDurationIntervalRef.current) clearInterval(callDurationIntervalRef.current);

    setCallState('idle');
    setRemainingCountdown(0);
    setCallDuration(0);
    setIsMuted(false);
    setIsSpeaker(false);
  };

  // Clean up all timers, audio and vibrations on unmount
  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      if (triggerTimeoutRef.current) clearTimeout(triggerTimeoutRef.current);
      if (callDurationIntervalRef.current) clearInterval(callDurationIntervalRef.current);
      stopRingtone();
      stopVibration();
      stopInCallVoice();
    };
  }, []);

  // Format call duration MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <>
      {/* ------------------------------------------------------------------- */}
      {/* Custom Audio Tags Hook: Swap in local MP3 files if you have them!   */}
      {/* Example: src="/assets/sounds/iphone_ringtone.mp3"                   */}
      {/* ------------------------------------------------------------------- */}
      <audio ref={externalAudioRef} loop preload="none" />
      <audio ref={inCallAudioRef} preload="none" />

      {/* ------------------------------------------------------------------- */}
      {/* 1. Quick Launch Button / Card in Main UI                            */}
      {/* ------------------------------------------------------------------- */}
      <button
        onClick={() => setIsSettingsOpen(true)}
        className={triggerButtonClass || "inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition transform active:scale-95"}
        title="Schedule Fake Call to escape uncomfortable or dangerous situations"
      >
        <PhoneIncoming className="w-4 h-4 text-indigo-200" />
        <span>Fake Call Escape</span>
      </button>

      {/* ------------------------------------------------------------------- */}
      {/* 2. Persistent Scheduled Countdown Badge / Toast                     */}
      {/* ------------------------------------------------------------------- */}
      {callState === 'scheduled' && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900/95 backdrop-blur-md text-white border border-indigo-400/40 p-4 rounded-3xl shadow-2xl flex items-center gap-4 animate-bounce">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5 animate-spin" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-sora font-extrabold text-indigo-300">FAKE CALL SCHEDULED</span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500 text-[10px] font-mono font-bold">
                {remainingCountdown}s
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              From: <strong className="text-white">{activeCaller.name}</strong>
            </p>
          </div>
          <button
            onClick={handleCancelScheduled}
            className="p-2 rounded-xl bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 text-xs font-bold transition ml-2"
          >
            Cancel
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* 3. Settings / Schedule Modal                                        */}
      {/* ------------------------------------------------------------------- */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-purple-100 space-y-5 animate-scaleUp">
            
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-2xl">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-sora font-extrabold text-slate-900 text-base">Fake Call Escape Setup</h3>
                  <p className="text-[11px] text-slate-500">Trigger a realistic call to discreetly leave any place</p>
                </div>
              </div>
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Select Caller Preset */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">Choose Caller Identity</label>
              <div className="grid grid-cols-2 gap-2">
                {PRESET_CALLERS.map(c => {
                  const isSelected = !isCustom && selectedCaller.id === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedCaller(c);
                        setIsCustom(false);
                      }}
                      className={`p-2.5 rounded-2xl border text-left flex items-center gap-2.5 transition ${
                        isSelected 
                          ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 font-bold shadow-sm ring-1 ring-indigo-500'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <img 
                        src={c.avatar} 
                        alt={c.name}
                        className="w-8 h-8 rounded-full object-cover shrink-0 shadow-sm" 
                      />
                      <div className="truncate">
                        <div className="text-xs font-bold truncate">{c.name}</div>
                        <div className="text-[10px] text-slate-500 truncate">{c.subtitle}</div>
                      </div>
                    </button>
                  );
                })}

                {/* Custom Caller Toggle Button */}
                <button
                  type="button"
                  onClick={() => setIsCustom(true)}
                  className={`p-2.5 rounded-2xl border text-left flex items-center gap-2.5 transition ${
                    isCustom 
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 font-bold shadow-sm ring-1 ring-indigo-500'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-purple-100 text-[#7C3AED] flex items-center justify-center shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-bold">Custom...</div>
                    <div className="text-[10px] text-slate-500">Your Own Name</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Custom Caller Inputs if selected */}
            {isCustom && (
              <div className="p-3 bg-purple-50/60 rounded-2xl border border-purple-100 space-y-2.5 text-xs animate-fadeIn">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Caller Name</label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="e.g. Dr. Patel, Landlord, Roommate"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Phone Number or Label</label>
                  <input
                    type="text"
                    value={customPhone}
                    onChange={(e) => setCustomPhone(e.target.value)}
                    placeholder="e.g. +1 (555) 234-5678"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}

            {/* Select Trigger Delay */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">When Should Phone Ring?</label>
              <div className="grid grid-cols-5 gap-1.5">
                {DELAY_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDelaySeconds(opt.value)}
                    className={`py-2 px-1 rounded-xl text-center text-xs font-bold transition ${
                      delaySeconds === opt.value
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Voice Line Preview */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-[11px] text-slate-600">
              <span className="font-bold text-slate-800 block mb-0.5">🗣️ Conversation Line (Spoken upon answering):</span>
              <p className="italic text-slate-500 font-mono">"{activeCaller.voiceLine}"</p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartFakeCall}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition flex items-center gap-1.5"
              >
                <PhoneIncoming className="w-4 h-4" />
                <span>Start Fake Call ({delaySeconds}s)</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* 4. Full-Screen Realistic Incoming Call Screen (ringing state)       */}
      {/* ------------------------------------------------------------------- */}
      {callState === 'ringing' && (
        <div className="fixed inset-0 z-[99999] bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white flex flex-col justify-between items-center py-16 px-6 select-none animate-fadeIn">
          
          {/* Top Info Bar */}
          <div className="text-center space-y-2 mt-4">
            <div className="text-sm font-semibold tracking-widest uppercase text-slate-400">
              Incoming Call
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold font-sora text-white tracking-tight">
              {activeCaller.name}
            </h1>
            <p className="text-sm text-slate-400 font-mono">
              {activeCaller.phone || activeCaller.subtitle}
            </p>
          </div>

          {/* Center Avatar with Pulsing Rings */}
          <div className="relative flex items-center justify-center my-auto">
            {/* Animated Pulsing Sound Rings */}
            <div className="absolute w-56 h-56 rounded-full bg-emerald-500/10 animate-ping pointer-events-none"></div>
            <div className="absolute w-44 h-44 rounded-full bg-indigo-500/20 animate-pulse pointer-events-none"></div>
            
            {/* Photo Avatar */}
            <img 
              src={activeCaller.avatar} 
              alt={activeCaller.name}
              className="relative z-10 w-36 h-36 rounded-full object-cover border-4 border-white/20 shadow-2xl" 
            />
          </div>

          {/* Quick Utility Prompts */}
          <div className="flex items-center justify-around w-full max-w-xs mb-8 text-slate-400 text-xs">
            <button className="flex flex-col items-center gap-1.5 hover:text-white transition">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <Bell className="w-5 h-5" />
              </div>
              <span className="text-[11px]">Remind Me</span>
            </button>
            <button className="flex flex-col items-center gap-1.5 hover:text-white transition">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <MessageSquare className="w-5 h-5" />
              </div>
              <span className="text-[11px]">Message</span>
            </button>
          </div>

          {/* Bottom Accept / Decline Buttons */}
          <div className="flex items-center justify-around w-full max-w-sm mb-4">
            
            {/* Decline Button (Red) */}
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={handleDeclineCall}
                className="w-18 h-18 md:w-20 md:h-20 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-2xl transition transform active:scale-95 ring-4 ring-rose-500/30"
                aria-label="Decline Call"
              >
                <PhoneOff className="w-8 h-8 rotate-135" />
              </button>
              <span className="text-xs font-semibold text-slate-300">Decline</span>
            </div>

            {/* Accept Button (Green with Pulse) */}
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={handleAcceptCall}
                className="w-18 h-18 md:w-20 md:h-20 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-2xl transition transform active:scale-95 ring-8 ring-emerald-400/40 animate-bounce"
                aria-label="Accept Call"
              >
                <Phone className="w-8 h-8" />
              </button>
              <span className="text-xs font-semibold text-emerald-400">Accept</span>
            </div>

          </div>

        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* 5. Full-Screen In-Call State (after answering)                     */}
      {/* ------------------------------------------------------------------- */}
      {callState === 'in_call' && (
        <div className="fixed inset-0 z-[99999] bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white flex flex-col justify-between items-center py-16 px-6 select-none animate-fadeIn">
          
          {/* Caller & Duration Header */}
          <div className="text-center space-y-1.5 mt-4">
            <h2 className="text-2xl md:text-3xl font-bold font-sora text-white">
              {activeCaller.name}
            </h2>
            <div className="text-emerald-400 font-mono font-extrabold text-sm tracking-widest">
              {formatTime(callDuration)}
            </div>
            <p className="text-xs text-slate-400">
              Connected • High Definition Call
            </p>
          </div>

          {/* Sound wave visualizer animation */}
          <div className="flex items-center justify-center gap-1.5 my-4">
            <span className="w-1.5 h-6 bg-emerald-400 rounded-full animate-pulse"></span>
            <span className="w-1.5 h-12 bg-emerald-400 rounded-full animate-pulse delay-75"></span>
            <span className="w-1.5 h-8 bg-emerald-400 rounded-full animate-pulse delay-150"></span>
            <span className="w-1.5 h-14 bg-emerald-400 rounded-full animate-pulse delay-100"></span>
            <span className="w-1.5 h-7 bg-emerald-400 rounded-full animate-pulse delay-200"></span>
          </div>

          {/* Active Call Control Keypad Grid (Realistic smartphone icons) */}
          <div className="grid grid-cols-3 gap-6 max-w-xs w-full my-auto text-center">
            
            {/* Mute */}
            <button 
              onClick={() => setIsMuted(!isMuted)}
              className="flex flex-col items-center gap-2 group"
            >
              <div className={`w-14 h-14 rounded-full flex items-center justify-center transition ${
                isMuted ? 'bg-white text-slate-900 font-bold' : 'bg-white/10 group-hover:bg-white/20 text-white'
              }`}>
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </div>
              <span className="text-[11px] text-slate-300">Mute</span>
            </button>

            {/* Keypad */}
            <button className="flex flex-col items-center gap-2 group">
              <div className="w-14 h-14 rounded-full bg-white/10 group-hover:bg-white/20 text-white flex items-center justify-center transition">
                <Grid className="w-6 h-6" />
              </div>
              <span className="text-[11px] text-slate-300">Keypad</span>
            </button>

            {/* Speaker */}
            <button 
              onClick={() => setIsSpeaker(!isSpeaker)}
              className="flex flex-col items-center gap-2 group"
            >
              <div className={`w-14 h-14 rounded-full flex items-center justify-center transition ${
                isSpeaker ? 'bg-white text-slate-900 font-bold' : 'bg-white/10 group-hover:bg-white/20 text-white'
              }`}>
                {isSpeaker ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
              </div>
              <span className="text-[11px] text-slate-300">Speaker</span>
            </button>

            {/* Add Call */}
            <button className="flex flex-col items-center gap-2 group">
              <div className="w-14 h-14 rounded-full bg-white/10 group-hover:bg-white/20 text-white flex items-center justify-center transition">
                <Plus className="w-6 h-6" />
              </div>
              <span className="text-[11px] text-slate-300">Add Call</span>
            </button>

            {/* FaceTime / Video */}
            <button className="flex flex-col items-center gap-2 group">
              <div className="w-14 h-14 rounded-full bg-white/10 group-hover:bg-white/20 text-white flex items-center justify-center transition">
                <Video className="w-6 h-6" />
              </div>
              <span className="text-[11px] text-slate-300">FaceTime</span>
            </button>

            {/* Contacts */}
            <button className="flex flex-col items-center gap-2 group">
              <div className="w-14 h-14 rounded-full bg-white/10 group-hover:bg-white/20 text-white flex items-center justify-center transition">
                <User className="w-6 h-6" />
              </div>
              <span className="text-[11px] text-slate-300">Contacts</span>
            </button>

          </div>

          {/* Big Red End Call Button */}
          <div className="flex flex-col items-center gap-2 mb-6">
            <button
              onClick={handleEndCall}
              className="w-18 h-18 md:w-20 md:h-20 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-2xl transition transform active:scale-95 ring-4 ring-rose-500/40"
              aria-label="End Call"
            >
              <PhoneOff className="w-8 h-8" />
            </button>
            <span className="text-xs font-semibold text-rose-300">End Call</span>
          </div>

        </div>
      )}
    </>
  );
}
