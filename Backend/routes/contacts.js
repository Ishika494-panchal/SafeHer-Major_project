import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, get, run } from '../config/database.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /contacts/ - Get all emergency contacts for the authenticated user
router.get('/', requireAuth, async (req, res) => {
  try {
    const contacts = await query(
      'SELECT * FROM emergency_contacts WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    return res.json(contacts);
  } catch (err) {
    console.error('Get contacts error:', err);
    return res.status(500).json({ detail: err.message });
  }
});

// POST /contacts/ - Add a new emergency contact
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, phone, relationship } = req.body;
    if (!name || !phone || !relationship) {
      return res.status(400).json({ detail: 'name, phone, and relationship are required' });
    }

    const contactId = uuidv4();
    await run(
      'INSERT INTO emergency_contacts (id, user_id, name, phone, relationship) VALUES (?, ?, ?, ?, ?)',
      [contactId, req.user.id, name, phone, relationship]
    );

    const contact = await get('SELECT * FROM emergency_contacts WHERE id = ?', [contactId]);
    return res.status(201).json(contact);
  } catch (err) {
    console.error('Create contact error:', err);
    return res.status(500).json({ detail: err.message });
  }
});

// PUT /contacts/:contact_id - Update an emergency contact
router.put('/:contact_id', requireAuth, async (req, res) => {
  try {
    const { contact_id } = req.params;
    const { name, phone, relationship } = req.body;

    const contact = await get(
      'SELECT * FROM emergency_contacts WHERE id = ? AND user_id = ?',
      [contact_id, req.user.id]
    );

    if (!contact) {
      return res.status(404).json({ detail: 'Emergency contact not found' });
    }

    const newName = name !== undefined ? name : contact.name;
    const newPhone = phone !== undefined ? phone : contact.phone;
    const newRel = relationship !== undefined ? relationship : contact.relationship;

    await run(
      'UPDATE emergency_contacts SET name = ?, phone = ?, relationship = ? WHERE id = ?',
      [newName, newPhone, newRel, contact_id]
    );

    const updated = await get('SELECT * FROM emergency_contacts WHERE id = ?', [contact_id]);
    return res.json(updated);
  } catch (err) {
    console.error('Update contact error:', err);
    return res.status(500).json({ detail: err.message });
  }
});

// DELETE /contacts/:contact_id - Delete an emergency contact
router.delete('/:contact_id', requireAuth, async (req, res) => {
  try {
    const { contact_id } = req.params;

    const contact = await get(
      'SELECT * FROM emergency_contacts WHERE id = ? AND user_id = ?',
      [contact_id, req.user.id]
    );

    if (!contact) {
      return res.status(404).json({ detail: 'Emergency contact not found' });
    }

    await run('DELETE FROM emergency_contacts WHERE id = ?', [contact_id]);
    return res.status(204).send();
  } catch (err) {
    console.error('Delete contact error:', err);
    return res.status(500).json({ detail: err.message });
  }
});

export default router;
