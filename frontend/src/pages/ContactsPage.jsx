import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiCall } from '../api/client';
import { PhoneCall, Plus, Trash2, User, AlertCircle, CheckCircle } from 'lucide-react';

export default function ContactsPage() {
  const { token } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    relation: '',
  });

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const data = await apiCall('/contacts', { token });
      setContacts(data.contacts || []);
    } catch (err) {
      setError(err.message || 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (contacts.length >= 5) {
      setError('Maximum limit of 5 emergency contacts reached');
      return;
    }

    setSubmitting(true);

    try {
      await apiCall('/contacts', {
        method: 'POST',
        body: formData,
        token,
      });

      setSuccess('Emergency contact added successfully');
      setFormData({ name: '', phone: '', relation: '' });
      fetchContacts();
    } catch (err) {
      setError(err.message || 'Failed to add contact');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    setError('');
    setSuccess('');

    try {
      await apiCall(`/contacts/${id}`, {
        method: 'DELETE',
        token,
      });
      setSuccess('Contact deleted');
      fetchContacts();
    } catch (err) {
      setError(err.message || 'Failed to delete contact');
    }
  };

  return (
    <div className="min-h-screen bg-safe-bg py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-safe-ink flex items-center space-x-2">
              <PhoneCall className="w-7 h-7 text-safe-purple" />
              <span>Emergency Contacts</span>
            </h1>
            <p className="text-safe-muted text-sm mt-1">
              Add up to 5 trusted contacts who will receive instant SMS alerts with your live location during an SOS trigger.
            </p>
          </div>
          <div className="bg-safe-purple/10 text-safe-purple px-4 py-2 rounded-lg text-sm font-bold">
            {contacts.length} / 5 Contacts
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-safe-red text-safe-red text-sm rounded-lg flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 border border-safe-green text-safe-green text-sm rounded-lg flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Add Contact Form */}
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 h-fit">
            <h2 className="text-lg font-bold text-safe-ink mb-4 flex items-center space-x-2">
              <Plus className="w-5 h-5 text-safe-purple" />
              <span>Add New Contact</span>
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-safe-ink uppercase mb-1">Name</label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Mom / Sarah"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-safe-ink text-sm focus:outline-none focus:border-safe-purple"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-safe-ink uppercase mb-1">Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+1234567890"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-safe-ink text-sm focus:outline-none focus:border-safe-purple"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-safe-ink uppercase mb-1">Relationship (Optional)</label>
                <input
                  type="text"
                  name="relation"
                  value={formData.relation}
                  onChange={handleChange}
                  placeholder="Mother / Friend / Sister"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-safe-ink text-sm focus:outline-none focus:border-safe-purple"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || contacts.length >= 5}
                className="w-full py-2.5 bg-safe-purple text-white font-bold rounded-lg shadow hover:bg-safe-purple-tint transition-all disabled:opacity-50 mt-2 flex items-center justify-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>{submitting ? 'Adding...' : 'Add Contact'}</span>
              </button>
            </form>
          </div>

          {/* Contact List */}
          <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-md border border-gray-100">
            <h2 className="text-lg font-bold text-safe-ink mb-4">Your Saved Contacts</h2>

            {loading ? (
              <p className="text-safe-muted text-sm py-4">Loading contacts...</p>
            ) : contacts.length === 0 ? (
              <div className="text-center py-8 text-safe-muted bg-safe-bg/50 rounded-lg border border-dashed border-gray-300">
                <User className="w-10 h-10 mx-auto text-safe-muted mb-2" />
                <p className="font-semibold text-sm">No emergency contacts added yet</p>
                <p className="text-xs mt-1">Add up to 5 contacts using the form.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-safe-purple-tint transition-colors"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-safe-ink">{contact.name}</span>
                        {contact.relation && (
                          <span className="text-xs bg-safe-bg text-safe-muted px-2 py-0.5 rounded font-medium">
                            {contact.relation}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-safe-muted mt-0.5">{contact.phone}</p>
                    </div>

                    <button
                      onClick={() => handleDelete(contact.id)}
                      className="p-2 text-safe-muted hover:text-safe-red hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete contact"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
