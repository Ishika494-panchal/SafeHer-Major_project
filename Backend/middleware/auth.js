import { get, run } from '../config/database.js';

export const getOrCreateDevUser = async (uid, name, email) => {
  let user = await get('SELECT * FROM users WHERE id = ?', [uid]);
  if (!user) {
    // Check if email exists with another id
    const existingByEmail = await get('SELECT * FROM users WHERE email = ?', [email]);
    if (existingByEmail) {
      user = existingByEmail;
    } else {
      await run(
        'INSERT INTO users (id, name, email, phone) VALUES (?, ?, ?, ?)',
        [uid, name, email, '+1-555-0199']
      );
      user = await get('SELECT * FROM users WHERE id = ?', [uid]);
    }
  }
  return user;
};

export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      // Fallback dev user if no header is supplied in local testing
      const devUser = await getOrCreateDevUser('dev_user_123', 'Demo Guardian User', 'demo@safeher.app');
      req.user = devUser;
      return next();
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
      return res.status(401).json({ detail: "Invalid authorization header format. Expected 'Bearer <token>'" });
    }

    const token = parts[1];

    // Dev mode token
    if (token.startsWith('dev-') || token === 'dev-token-123') {
      const uid = token.length > 8 ? `dev_user_${token.slice(-8)}` : 'dev_user_123';
      const devUser = await getOrCreateDevUser(uid, 'SafeHer User', `${uid}@safeher.app`);
      req.user = devUser;
      return next();
    }

    // Default dev fallback for arbitrary bearer tokens in local dev
    const uid = `user_${token.slice(0, 12)}`;
    const user = await getOrCreateDevUser(uid, 'SafeHer User', `${uid}@safeher.app`);
    req.user = user;
    return next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(401).json({ detail: `Authentication error: ${err.message}` });
  }
};
