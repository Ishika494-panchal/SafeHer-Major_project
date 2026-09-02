import React, { useState } from 'react';
import { MapPin, Navigation, Search, AlertCircle, Compass } from 'lucide-react';

export default function RoutePicker({
  userLocation,
  onCalculateRoutes,
  loading,
  isPickingOnMap,
  onToggleMapPick
}) {
  const [destLat, setDestLat] = useState('37.7760');
  const [destLng, setDestLng] = useState('-122.4180');

  const handleSubmit = (e) => {
    e.preventDefault();
    const origLat = userLocation?.lat || 37.7740;
    const origLng = userLocation?.lng || -122.4200;

    onCalculateRoutes({
      origin_lat: origLat,
      origin_lng: origLng,
      dest_lat: parseFloat(destLat),
      dest_lng: parseFloat(destLng)
    });
  };

  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-purple-100 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-purple-100 text-[#7C3AED] rounded-xl">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 font-sora">Safe Corridor Navigator</h3>
            <p className="text-[11px] text-slate-500">Pick destination to calculate 3 routes</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleMapPick}
          className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold transition flex items-center space-x-1 ${
            isPickingOnMap 
              ? 'bg-rose-500 text-white border-rose-500' 
              : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
          }`}
        >
          <MapPin className="w-3 h-3" />
          <span>{isPickingOnMap ? 'Clicking Map Active...' : 'Click Map to Pick'}</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Destination Lat</label>
            <input
              type="number"
              step="any"
              value={destLat}
              onChange={(e) => setDestLat(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Destination Lng</label>
            <input
              type="number"
              step="any"
              value={destLng}
              onChange={(e) => setDestLng(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center space-x-2 transition disabled:opacity-50"
        >
          <Search className="w-3.5 h-3.5" />
          <span>{loading ? 'Calculating Safe Corridor Routes...' : 'Find Safe Routes'}</span>
        </button>
      </form>
    </div>
  );
}
