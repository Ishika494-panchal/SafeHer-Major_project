import React, { useState, useEffect } from 'react';
import { ShieldCheck, Check, X, Clock, AlertTriangle, Eye, ShoppingBag, ShieldAlert, Image as ImageIcon, MapPin, RefreshCw } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function AdminPanel({ onReportStatusChanged }) {
  const [reports, setReports] = useState([]);
  const [filter, setFilter] = useState('pending'); // 'pending', 'approved', 'rejected', 'all'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/reports/?status_filter=${filter}`);
      if (!res.ok) throw new Error('Failed to load incident reports.');
      const data = await res.json();
      setReports(data);
      setError('');
    } catch (err) {
      setError(err.message || 'Unable to fetch moderation queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [filter]);

  const handleModerate = async (reportId, newStatus) => {
    setActionLoadingId(reportId);
    try {
      const res = await fetch(`${API_BASE_URL}/reports/${reportId}/moderate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error('Failed to update report status.');

      // Update local state
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status: newStatus } : r))
      );

      if (onReportStatusChanged) onReportStatusChanged();
    } catch (err) {
      alert(err.message || 'Error updating report status.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const getCategoryBadge = (category) => {
    switch (category) {
      case 'stalking':
        return { label: 'Stalking / Following', icon: Eye, color: 'bg-purple-100 text-purple-700 border-purple-200' };
      case 'theft':
        return { label: 'Theft / Robbery', icon: ShoppingBag, color: 'bg-amber-100 text-amber-800 border-amber-200' };
      case 'unsafe_location':
        return { label: 'Unsafe Location', icon: AlertTriangle, color: 'bg-orange-100 text-orange-800 border-orange-200' };
      default:
        return { label: 'Harassment / Abuse', icon: ShieldAlert, color: 'bg-rose-100 text-rose-700 border-rose-200' };
    }
  };

  const pendingCount = reports.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-purple-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-[#7C3AED]/10 text-[#7C3AED] rounded-2xl">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">Incident Report Moderation Panel</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Review user-submitted anonymous incident reports to verify safety heatmap data
            </p>
          </div>
        </div>

        <button
          onClick={fetchReports}
          className="px-4 py-2 bg-purple-50 hover:bg-purple-100 text-[#7C3AED] text-xs font-bold rounded-xl border border-purple-200 flex items-center space-x-2 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 border-b border-purple-100 pb-3 overflow-x-auto">
        {[
          { id: 'pending', label: 'Pending Moderation', count: pendingCount, color: 'bg-amber-500 text-white' },
          { id: 'approved', label: 'Approved Reports' },
          { id: 'rejected', label: 'Rejected Reports' },
          { id: 'all', label: 'All Reports' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-4 py-2 text-xs font-bold rounded-full transition flex items-center space-x-2 ${
              filter === tab.id
                ? 'bg-[#7C3AED] text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-purple-50 border border-purple-100'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold ${tab.color}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 font-bold text-xs flex flex-col items-center justify-center space-y-2">
          <RefreshCw className="w-6 h-6 animate-spin text-[#7C3AED]" />
          <span>Loading Incident Reports...</span>
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-700 flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : reports.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-purple-100 space-y-2">
          <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">No {filter} incident reports found</h3>
          <p className="text-xs text-slate-400">All submitted reports for this category have been processed.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reports.map((report) => {
            const catInfo = getCategoryBadge(report.category);
            const CatIcon = catInfo.icon;
            const isPending = report.status === 'pending';
            const isApproved = report.status === 'approved';
            const isRejected = report.status === 'rejected';

            return (
              <div
                key={report.id}
                className="bg-white rounded-3xl p-5 shadow-sm border border-purple-100 flex flex-col justify-between space-y-4 hover:shadow-md transition"
              >
                <div className="space-y-3">
                  {/* Card Top: Category & Status */}
                  <div className="flex items-center justify-between">
                    <span className={`px-3 py-1 text-[11px] font-bold rounded-full border flex items-center space-x-1.5 ${catInfo.color}`}>
                      <CatIcon className="w-3.5 h-3.5" />
                      <span>{catInfo.label}</span>
                    </span>

                    <span
                      className={`px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-wide rounded-full ${
                        isApproved
                          ? 'bg-emerald-100 text-emerald-700'
                          : isRejected
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-amber-100 text-amber-700 animate-pulse'
                      }`}
                    >
                      {report.status}
                    </span>
                  </div>

                  {/* Description Text */}
                  <p className="text-xs text-slate-800 leading-relaxed font-medium bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    "{report.description}"
                  </p>

                  {/* Location & Timestamp details */}
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 font-semibold">
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-3.5 h-3.5 text-[#7C3AED]" />
                      <span>Lat: {report.latitude.toFixed(4)}, Lng: {report.longitude.toFixed(4)}</span>
                    </div>

                    <div className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{new Date(report.created_at).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Media Attachments Preview */}
                  {report.media_urls && report.media_urls.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
                        <ImageIcon className="w-3 h-3" />
                        <span>Media Attachments ({report.media_urls.length})</span>
                      </span>
                      <div className="flex items-center gap-2 overflow-x-auto py-1">
                        {report.media_urls.map((url, idx) => {
                          const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
                          return (
                            <a
                              key={idx}
                              href={fullUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="w-16 h-16 rounded-xl border border-purple-100 overflow-hidden shrink-0 hover:opacity-80 transition"
                            >
                              <img src={fullUrl} alt="Report Evidence" className="w-full h-full object-cover" />
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Moderation Actions */}
                <div className="pt-3 border-t border-purple-50 flex items-center justify-end space-x-2">
                  {isPending ? (
                    <>
                      <button
                        onClick={() => handleModerate(report.id, 'rejected')}
                        disabled={actionLoadingId === report.id}
                        className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-xl border border-rose-200 flex items-center space-x-1.5 transition disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>

                      <button
                        onClick={() => handleModerate(report.id, 'approved')}
                        disabled={actionLoadingId === report.id}
                        className="px-5 py-2 bg-[#10B981] hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-md flex items-center space-x-1.5 transition disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve & Update Heatmap</span>
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleModerate(report.id, isApproved ? 'rejected' : 'approved')}
                      disabled={actionLoadingId === report.id}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                    >
                      Change Status to {isApproved ? 'Rejected' : 'Approved'}
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
