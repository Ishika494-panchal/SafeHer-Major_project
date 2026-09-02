import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, MapPin, Upload, AlertTriangle, Eye, ShoppingBag, ShieldCheck, CheckCircle2, ChevronRight, ArrowLeft } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Custom pin marker icon for location picking
const pinIcon = L.divIcon({
  className: 'custom-leaflet-marker',
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="#E11D48" stroke="#FFFFFF" stroke-width="2"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="3" fill="#FFFFFF"/></svg>`,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
});

// Interactive map click handler to update pinned coordinates
function LocationPickerMap({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });

  return position ? <Marker position={[position.lat, position.lng]} icon={pinIcon} /> : null;
}

export default function ReportModal({ isOpen, onClose, userLocation, onReportSubmitted }) {
  const [step, setStep] = useState(1); // 1: Category, 2: Location & Description, 3: Success
  const [category, setCategory] = useState('harassment');
  const [description, setDescription] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [useCurrentGps, setUseCurrentGps] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Set default coordinates when modal opens or user location updates
  useEffect(() => {
    if (userLocation) {
      setSelectedLocation({ lat: userLocation.lat, lng: userLocation.lng });
    } else {
      setSelectedLocation({ lat: 37.7749, lng: -122.4194 }); // Fallback
    }
  }, [userLocation, isOpen]);

  if (!isOpen) return null;

  const categories = [
    {
      id: 'harassment',
      label: 'Harassment / Abuse',
      icon: ShieldAlert,
      color: 'text-rose-600',
      bgColor: 'bg-rose-50 border-rose-200',
      description: 'Verbal, physical, or intimidation incident'
    },
    {
      id: 'stalking',
      label: 'Stalking / Following',
      icon: Eye,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 border-purple-200',
      description: 'Being followed or repeatedly targeted'
    },
    {
      id: 'theft',
      label: 'Theft / Robbery',
      icon: ShoppingBag,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50 border-amber-200',
      description: 'Stolen personal belongings or mugging'
    },
    {
      id: 'unsafe_location',
      label: 'Unsafe Location',
      icon: AlertTriangle,
      color: 'text-amber-700',
      bgColor: 'bg-orange-50 border-orange-200',
      description: 'Poor street lighting, broken infrastructure, or unsafe atmosphere'
    }
  ];

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);

    const previews = files.map(file => URL.createObjectURL(file));
    setFilePreviews(previews);
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!description || description.trim().length < 5) {
      setErrorMsg('Please provide a detailed description (at least 5 characters).');
      return;
    }
    if (!selectedLocation) {
      setErrorMsg('Please select an incident location.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const formData = new FormData();
      formData.append('category', category);
      formData.append('lat', selectedLocation.lat);
      formData.append('lng', selectedLocation.lng);
      formData.append('description', description);

      selectedFiles.forEach((file) => {
        formData.append('files', file);
      });

      const res = await fetch(`${API_BASE_URL}/reports/`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to submit report.');
      }

      setStep(3); // Show success view
      if (onReportSubmitted) onReportSubmitted();
    } catch (err) {
      setErrorMsg(err.message || 'Error submitting report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setCategory('harassment');
    setDescription('');
    setSelectedFiles([]);
    setFilePreviews([]);
    setErrorMsg('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-purple-100 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header Bar */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold">Report an Incident</h2>
              <p className="text-xs text-purple-200">100% Anonymous & Secure Distress Signal</p>
            </div>
          </div>
          <button 
            onClick={resetForm} 
            className="p-1.5 text-purple-200 hover:text-white hover:bg-white/10 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Anonymous Guarantee Callout */}
        <div className="bg-emerald-50 px-6 py-2.5 border-b border-emerald-100 flex items-center space-x-2 text-xs font-bold text-emerald-800">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Privacy Guaranteed: Your identity is strictly anonymous. No account or user ID is saved with this report.</span>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: CATEGORY SELECTION */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800">1. Select Incident Category</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {categories.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = category === cat.id;
                  return (
                    <div
                      key={cat.id}
                      onClick={() => setCategory(cat.id)}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                        isSelected 
                          ? 'border-[#7C3AED] bg-purple-50/70 shadow-md ring-2 ring-[#7C3AED]/20' 
                          : 'border-slate-100 hover:border-purple-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`p-2.5 rounded-xl border ${cat.bgColor}`}>
                          <Icon className={`w-5 h-5 ${cat.color}`} />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{cat.label}</h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">{cat.description}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-6 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold rounded-xl shadow-md flex items-center space-x-2 transition"
                >
                  <span>Next: Location & Details</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: LOCATION & DESCRIPTION */}
          {step === 2 && (
            <form onSubmit={handleSubmitReport} className="space-y-5">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs font-bold text-slate-500 hover:text-[#7C3AED] flex items-center space-x-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Category</span>
                </button>
                <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-100">
                  Category: {categories.find(c => c.id === category)?.label}
                </span>
              </div>

              {/* Location Picker */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  2. Incident Location (Click map to pin point)
                </label>
                
                <div className="flex items-center space-x-3 text-xs mb-2">
                  <button
                    type="button"
                    onClick={() => {
                      setUseCurrentGps(true);
                      if (userLocation) setSelectedLocation({ lat: userLocation.lat, lng: userLocation.lng });
                    }}
                    className={`px-3 py-1.5 rounded-lg border font-bold flex items-center space-x-1.5 transition ${
                      useCurrentGps 
                        ? 'bg-[#7C3AED] text-white border-[#7C3AED]' 
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Use My Current Location</span>
                  </button>

                  <span className="text-slate-400">or click on map</span>
                </div>

                <div className="w-full h-48 rounded-2xl overflow-hidden border border-purple-100 shadow-inner relative z-0">
                  <MapContainer
                    center={[selectedLocation?.lat || 37.7749, selectedLocation?.lng || -122.4194]}
                    zoom={15}
                    className="w-full h-full"
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <LocationPickerMap position={selectedLocation} setPosition={(pos) => { setSelectedLocation(pos); setUseCurrentGps(false); }} />
                  </MapContainer>
                  <div className="absolute bottom-2 left-2 z-[1000] bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-bold text-slate-700 shadow border border-purple-100">
                    Lat: {selectedLocation?.lat.toFixed(5)}, Lng: {selectedLocation?.lng.toFixed(5)}
                  </div>
                </div>
              </div>

              {/* Description Field */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  3. Description & Details
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide brief context (e.g. Unlit alley near train station, suspicious person in dark hoodie)..."
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
                  required
                />
              </div>

              {/* Optional Photo/Video Upload */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  4. Optional Media Evidence (Photo / Video / Audio)
                </label>
                
                <div className="border-2 border-dashed border-purple-200 hover:border-[#7C3AED] bg-purple-50/40 rounded-2xl p-4 text-center cursor-pointer transition">
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*,audio/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="report-media-upload"
                  />
                  <label htmlFor="report-media-upload" className="cursor-pointer flex flex-col items-center justify-center space-y-1">
                    <Upload className="w-5 h-5 text-[#7C3AED]" />
                    <span className="text-xs font-bold text-slate-700">Click to upload photo or media file</span>
                    <span className="text-[10px] text-slate-500">Stored safely on server for moderation</span>
                  </label>
                </div>

                {filePreviews.length > 0 && (
                  <div className="flex items-center gap-2 mt-2 overflow-x-auto py-1">
                    {filePreviews.map((src, idx) => (
                      <div key={idx} className="w-14 h-14 rounded-xl border border-purple-200 overflow-hidden relative shrink-0">
                        <img src={src} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Form Action Buttons */}
              <div className="pt-3 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-[#E11D48] hover:bg-[#D97706] text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-500/20 flex items-center space-x-2 transition disabled:opacity-50"
                >
                  {submitting ? (
                    <span>Submitting Report...</span>
                  ) : (
                    <>
                      <ShieldAlert className="w-4 h-4" />
                      <span>Submit Anonymous Report</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: SUCCESS CONFIRMATION */}
          {step === 3 && (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Incident Report Submitted!</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  Thank you for keeping the community safe. Your report has been submitted anonymously and will update safety heatmaps upon verification.
                </p>
              </div>
              
              <div className="pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold rounded-xl shadow-md transition"
                >
                  Back to Safety Dashboard
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
