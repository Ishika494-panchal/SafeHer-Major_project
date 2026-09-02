import express from 'express';
import { get, run } from '../config/database.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /auth/me - Current user profile
router.get('/me', requireAuth, (req, res) => {
  return res.json(req.user);
});

// POST /auth/sync - Sync user account details from Firebase login into local DB
router.post('/sync', requireAuth, async (req, res) => {
  try {
    const { id, name, email, phone } = req.body;
    if (!id || !email) {
      return res.status(400).json({ detail: 'id and email are required' });
    }

    let user = await get('SELECT * FROM users WHERE id = ?', [id]);
    if (!user) {
      // Check if user already exists with this email
      const existingByEmail = await get('SELECT * FROM users WHERE email = ?', [email]);
      if (existingByEmail) {
        await run('UPDATE users SET name = ?, phone = ? WHERE id = ?', [name || existingByEmail.name, phone || existingByEmail.phone, existingByEmail.id]);
        user = await get('SELECT * FROM users WHERE id = ?', [existingByEmail.id]);
      } else {
        await run(
          'INSERT INTO users (id, name, email, phone) VALUES (?, ?, ?, ?)',
          [id, name || email.split('@')[0], email, phone || '+1-555-0199']
        );
        user = await get('SELECT * FROM users WHERE id = ?', [id]);
      }
    } else {
      await run(
        'UPDATE users SET name = ?, email = ?, phone = ? WHERE id = ?',
        [name || user.name, email || user.email, phone || user.phone, id]
      );
      user = await get('SELECT * FROM users WHERE id = ?', [id]);
    }

    return res.json(user);
  } catch (err) {
    console.error('Auth sync error:', err);
    return res.status(500).json({ detail: `Error syncing user: ${err.message}` });
  }
});

export default router;
