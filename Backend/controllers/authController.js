const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

const signup = async (req, res) => {
  const { name, email, phone, password, id_proof_url, availability } = req.body;

  const role = req.body.role || 'woman';

  // Validate role before hitting the database.
  // The DB also enforces this via CHECK constraint, but returning a clear
  // 400 here is friendlier than leaking a raw PostgreSQL error to the client.
  if (!['woman', 'volunteer'].includes(role)) {
    return res.status(400).json({ error: "role must be 'woman' or 'volunteer'" });
  }

  try {
    // Hash the password with bcrypt (saltRounds=10 is the industry-standard default).
    // We never store or log the plain-text password anywhere.
    const password_hash = await bcrypt.hash(password, 10);

    // Insert the user row and return the generated fields so we can use them below.
    const userResult = await pool.query(
      `INSERT INTO users (name, email, phone, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, role, created_at`,
      [name, email, phone || null, password_hash, role]
    );

    const user = userResult.rows[0];

    // If the new user is a volunteer, create their (initially empty) profile row.
    // id_proof_url and availability are optional at signup — the volunteer fills
    // them in later through the profile-update endpoint.
    if (role === 'volunteer') {
      await pool.query(
        `INSERT INTO volunteer_profiles (user_id, id_proof_url, availability)
         VALUES ($1, $2, $3)`,
        [user.id, id_proof_url || null, availability || null]
      );
    }

    // Sign a JWT containing user_id and role.
    // Including role in the token lets downstream middleware gate routes without
    // an extra DB lookup on every request.
    const token = jwt.sign(
      { user_id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({ token, user });
  } catch (err) {
    // Unique-violation code 23505 means the email is already registered.
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already registered' });
    }
    console.error('Signup error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ─── Login ────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// Body: { email, password }
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Fetch the user by email. We SELECT role here too so the JWT stays up-to-date
    // with the user's current role in case an admin changed it since last login.
    const result = await pool.query(
      'SELECT id, email, password_hash, role FROM users WHERE email = $1',
      [email]
    );

    const user = result.rows[0];

    // Use a constant-time compare (bcrypt) to avoid leaking timing info about
    // whether the email exists. We compare even if user is undefined — the hash
    // won't match, and we return the same generic error either way.
    const validPassword = user
      ? await bcrypt.compare(password, user.password_hash)
      : false;

    if (!user || !validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { user_id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({ token });
  } catch (err) {
    console.error('Login error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { signup, login };
