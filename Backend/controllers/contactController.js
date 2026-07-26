const pool = require('../db/pool');

const addContact = async (req, res) => {
  const { name, phone, relation } = req.body;
  const user_id = req.user.user_id;

  if (!name || !phone) {
    return res.status(400).json({ error: 'Name and phone are required' });
  }

  try {
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM emergency_contacts WHERE user_id = $1',
      [user_id]
    );

    const count = parseInt(countResult.rows[0].count, 10);
    if (count >= 5) {
      return res.status(400).json({ error: 'Maximum limit of 5 emergency contacts reached' });
    }

    const result = await pool.query(
      `INSERT INTO emergency_contacts (user_id, name, phone, relation)
       VALUES ($1, $2, $3, $4)
       RETURNING id, user_id, name, phone, relation, created_at`,
      [user_id, name, phone, relation || null]
    );

    return res.status(201).json({
      message: 'Emergency contact added',
      contact: result.rows[0],
    });
  } catch (err) {
    console.error('addContact error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const getContacts = async (req, res) => {
  const user_id = req.user.user_id;

  try {
    const result = await pool.query(
      `SELECT id, name, phone, relation, created_at
       FROM emergency_contacts
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [user_id]
    );

    return res.status(200).json({
      contacts: result.rows,
    });
  } catch (err) {
    console.error('getContacts error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteContact = async (req, res) => {
  const { contactId } = req.params;
  const user_id = req.user.user_id;

  try {
    const result = await pool.query(
      'DELETE FROM emergency_contacts WHERE id = $1 AND user_id = $2 RETURNING id',
      [contactId, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    return res.status(200).json({ message: 'Contact deleted' });
  } catch (err) {
    console.error('deleteContact error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { addContact, getContacts, deleteContact };
