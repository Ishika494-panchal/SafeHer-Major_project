import React, { useState, useRef, useEffect } from 'react';
import { BellRing, ShieldAlert, CheckCircle, AlertTriangle } from 'lucide-react';

export default function SosButton({ onSosTriggered, onSosCancelled, isSosActive, activeAlertId }) {
  const [holdProgress, setHoldProgress] = useState(0); // 0 to 100
  const [isHolding, setIsHolding] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  const HOLD_DURATION = 2000; // 2 seconds requirement

  const startHold = () => {
    if (isSosActive || isDispatching) return;
    setIsHolding(true);
    setHoldProgress(0);
    startTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.min(100, (elapsed / HOLD_DURATION) * 100);
      setHoldProgress(progress);

      if (elapsed >= HOLD_DURATION) {
        clearInterval(timerRef.current);
        triggerEmergency();
      }
    }, 20);
  };

  const stopHold = () => {
    if (isDispatching) return;
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setIsHolding(false);
    setHoldProgress(0);
  };

  const triggerEmergency = async () => {
    setIsHolding(false);
    setIsDispatching(true);
    try {
      if (onSosTriggered) {
        await onSosTriggered();
      }
    } catch (err) {
      console.error("SOS trigger error:", err);
    } finally {
      setIsDispatching(false);
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center select-none py-4">
      {/* SOS Button Container */}
      <div className="relative flex items-center justify-center">
        
        {/* Outer Pulsing Rings when Active */}
        {isSosActive && (
          <>
            <div className="absolute w-52 h-52 rounded-full bg-[#E11D48]/20 animate-ping pointer-events-none"></div>
            <div className="absolute w-44 h-44 rounded-full bg-[#E11D48]/30 animate-pulse pointer-events-none"></div>
          </>
        )}

        {/* SVG Circular Countdown Ring when Holding */}
        {isHolding && (
          <svg className="absolute w-44 h-44 -rotate-90 pointer-events-none" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="44"
              className="stroke-rose-200 fill-none"
              strokeWidth="6"
            />
            <circle
              cx="50"
              cy="50"
              r="44"
              className="stroke-[#E11D48] fill-none transition-all duration-75"
              strokeWidth="6"
              strokeDasharray="276.46"
              strokeDashoffset={276.46 - (276.46 * holdProgress) / 100}
              strokeLinecap="round"
            />
          </svg>
        )}

        {/* Main SOS Trigger Button */}
        <button
          onMouseDown={startHold}
          onMouseUp={stopHold}
          onMouseLeave={stopHold}
          onTouchStart={startHold}
          onTouchEnd={stopHold}
          disabled={isDispatching}
          className={`relative z-10 w-36 h-36 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all duration-300 transform ${
            isSosActive
              ? 'bg-[#E11D48] text-white ring-8 ring-rose-300/50 animate-pulse shadow-glow-sos scale-105'
              : isHolding
              ? 'bg-rose-700 text-white scale-95 shadow-glow-sos ring-4 ring-rose-400'
              : 'bg-gradient-to-br from-[#E11D48] via-rose-600 to-rose-700 text-white hover:scale-105 active:scale-95 shadow-glow-sos hover:shadow-2xl'
          }`}
        >
          {isDispatching ? (
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin mb-1"></div>
              <span className="text-[11px] font-sora font-extrabold uppercase tracking-wider">FIRING SOS</span>
            </div>
          ) : isSosActive ? (
            <div className="flex flex-col items-center">
              <BellRing className="w-10 h-10 animate-bounce mb-1" />
              <span className="text-xs font-sora font-extrabold tracking-widest uppercase">SOS ACTIVE</span>
              <span className="text-[10px] text-rose-100 mt-0.5">Live Tracking</span>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center px-2">
              <ShieldAlert className={`w-9 h-9 mb-1 ${isHolding ? 'animate-ping' : ''}`} />
              <span className="text-xs font-sora font-extrabold tracking-wider uppercase">HOLD 2 SECONDS</span>
              <span className="text-[9px] text-rose-100 font-semibold mt-0.5">EMERGENCY SOS</span>
            </div>
          )}
        </button>

      </div>

      {/* Progress & Helper Subtext */}
      <div className="mt-4 text-center">
        {isHolding ? (
          <div className="text-xs font-bold text-[#E11D48] animate-pulse">
            Keep holding... {Math.round(holdProgress)}%
          </div>
        ) : isSosActive ? (
          <div className="space-y-2">
            <p className="text-xs font-bold text-[#E11D48] flex items-center justify-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> Live Distress Broadcast Active
            </p>
            {onSosCancelled && (
              <button
                onClick={onSosCancelled}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-full text-xs font-bold transition shadow-sm"
              >
                Cancel / Resolve Emergency
              </button>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-500 font-medium">
            Press and hold for <strong className="text-slate-800">2 seconds</strong> to broadcast live GPS distress signal
          </p>
        )}
      </div>

    </div>
  );
}
