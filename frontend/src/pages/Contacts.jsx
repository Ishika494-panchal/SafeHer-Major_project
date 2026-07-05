import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './Contacts.css';

// ── Icon components (inline SVG — no extra library needed) ──
const IconUsers = () => (
  <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const IconPhone = () => (
  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6.13 6.13l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
);

const IconPlus = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5"
    strokeLinecap="round" viewBox="0 0 24 24">
    <path d="M12 5v14M5 12h14"/>
  </svg>
);

const IconTrash = () => (
  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14H6L5 6"/>
    <path d="M10 11v6M14 11v6"/>
    <path d="M9 6V4h6v2"/>
  </svg>
);

const IconEmpty = () => (
  <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5"
    strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <line x1="17" y1="11" x2="23" y2="17"/>
    <line x1="23" y1="11" x2="17" y2="17"/>
  </svg>
);

// ── Helper: get initials from a name ──
function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function Contacts() {
  // ── Form state ──────────────────────────────────────
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);

  // ── List state ──────────────────────────────────────
  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [listError, setListError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // ── Current user ────────────────────────────────────
  const [userId, setUserId] = useState(null);

  // ── Fetch contacts on mount ─────────────────────────
  useEffect(() => {
    // Get the logged-in user's ID first, then load their contacts
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        fetchContacts(user.id);
      }
    });
  }, []);

  async function fetchContacts(uid) {
    setLoadingContacts(true);
    setListError(null);
    // Filter by user_id so each user only sees their own contacts
    const query = supabase
      .from('emergency_contacts')
      .select('*')
      .order('created_at', { ascending: false });

    if (uid) query.eq('user_id', uid);

    const { data, error } = await query;

    if (error) {
      setListError(error.message);
    } else {
      setContacts(data || []);
    }
    setLoadingContacts(false);
  }

  // ── Handle form submit ──────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!name.trim() || !phone.trim() || !relationship.trim()) {
      setFormError('All fields are required.');
      return;
    }

    if (!userId) {
      setFormError('You must be logged in to add a contact.');
      return;
    }

    setSubmitting(true);
    // Pass user_id explicitly so the RLS delete policy (user_id = auth.uid()) can match
    const { error } = await supabase
      .from('emergency_contacts')
      .insert({
        name: name.trim(),
        phone: phone.trim(),
        relationship: relationship.trim(),
        user_id: userId,         // ← required for delete RLS to work
      });

    if (error) {
      setFormError(error.message);
    } else {
      setFormSuccess(`${name.trim()} added to your Safety Circle!`);
      setName('');
      setPhone('');
      setRelationship('');
      fetchContacts(userId); // refresh list
    }
    setSubmitting(false);
  }

  // ── Handle delete ───────────────────────────────────
  async function handleDelete(contactId, contactName) {
    if (!window.confirm(`Remove ${contactName} from your Safety Circle?`)) return;
    setDeletingId(contactId);
    setListError(null);

    const { error } = await supabase
      .from('emergency_contacts')
      .delete()
      .eq('id', contactId)
      .eq('user_id', userId);   // ← matches RLS delete policy

    if (error) {
      // Common cause: RLS delete policy missing in Supabase dashboard
      setListError(
        `Delete failed: ${error.message}. ` +
        `Make sure a DELETE RLS policy exists on the emergency_contacts table in Supabase.`
      );
    } else {
      // Optimistically remove from UI — no need to re-fetch
      setContacts(prev => prev.filter(c => c.id !== contactId));
    }
    setDeletingId(null);
  }

  // ── Render ──────────────────────────────────────────
  return (
    <div className="contacts-wrapper">

      {/* Page Header */}
      <div className="contacts-header">
        <h1 className="contacts-title">
          <IconUsers />
          Safety Circle
        </h1>
        <p className="contacts-subtitle">
          Add trusted contacts who will be notified in an emergency.
        </p>
      </div>

      {/* ── Add Contact Form Card ── */}
      <div className="contacts-form-card">
        <h2 className="form-card-title">
          <IconPlus />
          Add a Contact
        </h2>

        {formError && <div className="alert error">{formError}</div>}
        {formSuccess && <div className="alert success">✓ {formSuccess}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="contacts-form-grid">

            <div className="form-group">
              <label className="form-label" htmlFor="contact-name">Full Name</label>
              <input
                id="contact-name"
                className="form-input"
                type="text"
                placeholder="e.g. Priya Sharma"
                value={name}
                onChange={e => setName(e.target.value)}
                disabled={submitting}
                autoComplete="off"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="contact-phone">Phone Number</label>
              <input
                id="contact-phone"
                className="form-input"
                type="tel"
                placeholder="e.g. +91 98765 43210"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                disabled={submitting}
                autoComplete="off"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="contact-relationship">Relationship</label>
              <input
                id="contact-relationship"
                className="form-input"
                type="text"
                placeholder="e.g. Sister, Friend, Mother"
                value={relationship}
                onChange={e => setRelationship(e.target.value)}
                disabled={submitting}
                autoComplete="off"
              />
            </div>

          </div>

          <button
            type="submit"
            className="contacts-submit-btn"
            disabled={submitting}
          >
            <IconPlus />
            {submitting ? 'Adding...' : 'Add to Safety Circle'}
          </button>
        </form>
      </div>

      {/* ── Contact List Card ── */}
      <div className="contacts-list-card">
        <div className="contacts-list-header">
          <h2 className="contacts-list-title">
            <IconUsers />
            Your Contacts
          </h2>
          {contacts.length > 0 && (
            <span className="contacts-count-badge">{contacts.length}</span>
          )}
        </div>

        {listError && <div className="alert error">{listError}</div>}

        {loadingContacts ? (
          <p className="loading-text">Loading contacts…</p>
        ) : contacts.length === 0 ? (
          <div className="contacts-empty">
            <IconEmpty />
            No contacts yet. Add your first trusted contact above.
          </div>
        ) : (
          contacts.map(contact => (
            <div className="contact-item" key={contact.id}>
              <div className="contact-avatar">
                {getInitials(contact.name)}
              </div>

              <div className="contact-info">
                <p className="contact-name">{contact.name}</p>
                <div className="contact-meta">
                  <span className="contact-phone">
                    <IconPhone />
                    {contact.phone}
                  </span>
                  <span className="contact-relationship">
                    {contact.relationship}
                  </span>
                </div>
              </div>

              <button
                className="contact-delete-btn"
                onClick={() => handleDelete(contact.id, contact.name)}
                disabled={deletingId === contact.id}
                title="Remove contact"
              >
                <IconTrash />
                {deletingId === contact.id ? 'Removing…' : 'Remove'}
              </button>
            </div>
          ))
        )}
      </div>

    </div>
  );
}
