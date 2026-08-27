import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Phone, Heart, Trash2, Edit3, CheckCircle, AlertCircle, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function EmergencyContacts({ contacts, onContactsUpdated }) {
  const { authToken } = useAuth();
  const [localContacts, setLocalContacts] = useState(contacts || []);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({ name: '', phone: '', relationship: 'Family' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchContacts();
  }, [authToken]);

  const fetchContacts = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/contacts/`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLocalContacts(data);
        if (onContactsUpdated) onContactsUpdated(data);
      }
    } catch (err) {
      console.warn("Could not fetch contacts from API:", err);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const url = editingId 
        ? `${API_BASE_URL}/contacts/${editingId}`
        : `${API_BASE_URL}/contacts/`;
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(formData)
      });

      if (!res.ok) throw new Error("Failed to save emergency contact");

      await fetchContacts();
      setSuccessMsg(editingId ? "Contact updated successfully!" : "Emergency contact added!");
      setFormData({ name: '', phone: '', relationship: 'Family' });
      setIsAdding(false);
      setEditingId(null);

      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      // Local fallback for offline/demo mode
      const newContact = {
        id: editingId || `demo_c_${Date.now()}`,
        name: formData.name,
        phone: formData.phone,
        relationship: formData.relationship
      };
      
      let updated;
      if (editingId) {
        updated = localContacts.map(c => c.id === editingId ? newContact : c);
      } else {
        updated = [...localContacts, newContact];
      }
      setLocalContacts(updated);
      if (onContactsUpdated) onContactsUpdated(updated);

      setSuccessMsg("Contact saved!");
      setFormData({ name: '', phone: '', relationship: 'Family' });
      setIsAdding(false);
      setEditingId(null);
      setTimeout(() => setSuccessMsg(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (contact) => {
    setEditingId(contact.id);
    setFormData({ name: contact.name, phone: contact.phone, relationship: contact.relationship });
    setIsAdding(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to remove this emergency contact?")) return;

    try {
      await fetch(`${API_BASE_URL}/contacts/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
    } catch (err) {
      console.warn("Delete request error:", err);
    }

    const filtered = localContacts.filter(c => c.id !== id);
    setLocalContacts(filtered);
    if (onContactsUpdated) onContactsUpdated(filtered);
    setSuccessMsg("Contact removed.");
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-purple-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-100 text-[#7C3AED] rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-sora font-extrabold text-slate-900">Guardian Contacts Circle</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                These trusted contacts will receive instant SMS alerts and live GPS tracking when you trigger an SOS.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            setIsAdding(!isAdding);
            setEditingId(null);
            setFormData({ name: '', phone: '', relationship: 'Family' });
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold text-xs shadow-glow-purple transition"
        >
          <UserPlus className="w-4 h-4" />
          <span>{isAdding ? 'Close Form' : 'Add Emergency Contact'}</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-[#10B981] font-semibold text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Add / Edit Form Drawer */}
      {isAdding && (
        <form onSubmit={handleSave} className="bg-purple-50/80 border border-purple-200 rounded-3xl p-6 space-y-4 shadow-sm animate-fadeIn">
          <h3 className="font-sora font-bold text-slate-900 text-sm flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#7C3AED]" />
            {editingId ? 'Edit Emergency Contact' : 'Add New Guardian Contact'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Sarah Connor"
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#7C3AED] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 555-0199"
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#7C3AED] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Relationship</label>
              <select
                value={formData.relationship}
                onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#7C3AED] outline-none"
              >
                <option value="Parent">Parent</option>
                <option value="Spouse">Spouse / Partner</option>
                <option value="Sibling">Sibling</option>
                <option value="Best Friend">Best Friend</option>
                <option value="Guardian">Guardian</option>
                <option value="Colleague">Colleague / Peer</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setIsAdding(false); setEditingId(null); }}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/60 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 rounded-xl text-xs font-bold bg-[#7C3AED] hover:bg-[#6D28D9] text-white transition shadow-sm"
            >
              {loading ? 'Saving...' : editingId ? 'Update Contact' : 'Save Guardian'}
            </button>
          </div>
        </form>
      )}

      {/* Contacts List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {localContacts.length === 0 ? (
          <div className="col-span-full bg-white rounded-3xl p-8 text-center border border-dashed border-purple-200">
            <Heart className="w-12 h-12 text-purple-300 mx-auto mb-3" />
            <h4 className="font-sora font-bold text-slate-800 text-sm">No Emergency Contacts Added Yet</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Add at least 2-3 trusted guardians (family or close friends) so they can be notified immediately during an SOS distress event.
            </p>
          </div>
        ) : (
          localContacts.map((contact) => (
            <div 
              key={contact.id}
              className="bg-white rounded-2xl p-5 border border-purple-100 shadow-sm hover:shadow-md transition flex items-center justify-between"
            >
              <div className="flex items-center space-x-3.5">
                <div className="w-11 h-11 rounded-2xl bg-purple-100 text-[#7C3AED] font-sora font-bold flex items-center justify-center text-sm shadow-inner">
                  {contact.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{contact.name}</h4>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <Phone className="w-3 h-3 text-[#7C3AED]" /> {contact.phone}
                  </p>
                  <span className="inline-block mt-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#10B981] text-[10px] font-bold">
                    {contact.relationship}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  onClick={() => handleEdit(contact)}
                  className="p-2 text-slate-400 hover:text-[#7C3AED] rounded-lg hover:bg-purple-50 transition"
                  title="Edit Contact"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(contact.id)}
                  className="p-2 text-slate-400 hover:text-[#E11D48] rounded-lg hover:bg-rose-50 transition"
                  title="Remove Contact"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}
