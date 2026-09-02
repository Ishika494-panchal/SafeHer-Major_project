import React from 'react';
import { ShieldCheck, Clock, Navigation, CheckCircle2, Zap, Compass, ArrowRight } from 'lucide-react';

export default function RouteComparisonCard({
  routes,
  selectedRouteType,
  onSelectRouteType,
  onStartNavigation,
  isNavigating
}) {
  if (!routes) return null;

  const { safest, shortest, fastest } = routes;

  const routeOptions = [
    {
      id: 'safest',
      title: 'Safest Route',
      badge: 'RECOMMENDED',
      badgeBg: 'bg-[#7C3AED] text-white',
      borderColor: 'border-[#7C3AED] bg-purple-50/70',
      activeBorder: 'ring-2 ring-[#7C3AED] border-[#7C3AED]',
      icon: ShieldCheck,
      iconColor: 'text-[#7C3AED]',
      data: safest,
      summary: 'Detours around active danger clusters with maximum security monitoring.'
    },
    {
      id: 'shortest',
      title: 'Shortest Route',
      badge: 'DIRECT',
      badgeBg: 'bg-blue-100 text-blue-700',
      borderColor: 'border-blue-200 bg-blue-50/40',
      activeBorder: 'ring-2 ring-blue-500 border-blue-500',
      icon: Compass,
      iconColor: 'text-blue-600',
      data: shortest,
      summary: 'Shortest physical walking distance between origin and destination.'
    },
    {
      id: 'fastest',
      title: 'Fastest Route',
      badge: 'EXPRESS',
      badgeBg: 'bg-slate-100 text-slate-700',
      borderColor: 'border-slate-200 bg-slate-50/40',
      activeBorder: 'ring-2 ring-slate-400 border-slate-500',
      icon: Zap,
      iconColor: 'text-slate-600',
      data: fastest,
      summary: 'Optimized for travel time along main thoroughfares.'
    }
  ];

  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-purple-100 space-y-4">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-purple-100 text-[#7C3AED] rounded-xl">
            <Navigation className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 font-sora">Select Recommended Route</h3>
            <p className="text-[11px] text-slate-500">Multi-criteria routing algorithm</p>
          </div>
        </div>

        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping"></span>
          SafeHer Graph AI
        </span>
      </div>

      {/* Route Cards Options */}
      <div className="grid grid-cols-1 gap-3">
        {routeOptions.map((opt) => {
          if (!opt.data) return null;
          const Icon = opt.icon;
          const isSelected = selectedRouteType === opt.id;

          return (
            <div
              key={opt.id}
              onClick={() => onSelectRouteType(opt.id)}
              className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
                isSelected 
                  ? `${opt.activeBorder} shadow-md bg-white` 
                  : 'border-slate-100 hover:border-purple-200 bg-slate-50/50 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className={`p-2 rounded-xl border ${opt.borderColor}`}>
                    <Icon className={`w-4 h-4 ${opt.iconColor}`} />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-xs font-bold text-slate-900">{opt.title}</h4>
                      <span className={`px-2 py-0.5 text-[9px] font-extrabold rounded-full ${opt.badgeBg}`}>
                        {opt.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{opt.summary}</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs font-extrabold text-slate-900">
                    {opt.data.total_distance_km} km • {opt.data.total_time_minutes} min
                  </div>
                  <div className="text-[10px] font-bold text-slate-500 mt-0.5 flex items-center justify-end space-x-1">
                    <span>Risk Score:</span>
                    <span className={`font-extrabold ${opt.data.total_risk_score < 4 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {opt.data.total_risk_score}/10
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Start Navigation Button */}
      <button
        onClick={onStartNavigation}
        className={`w-full py-3 text-xs font-bold rounded-2xl shadow-lg flex items-center justify-center space-x-2 transition ${
          isNavigating
            ? 'bg-rose-600 hover:bg-rose-700 text-white'
            : 'bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-purple-500/20'
        }`}
      >
        <Navigation className="w-4 h-4" />
        <span>{isNavigating ? 'Cancel Safe Navigation' : `Start Safe Navigation (${selectedRouteType.toUpperCase()} Path)`}</span>
        <ArrowRight className="w-4 h-4" />
      </button>

    </div>
  );
}
