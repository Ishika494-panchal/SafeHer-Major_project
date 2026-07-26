require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  // Railway's public network endpoint uses TLS.
  // rejectUnauthorized: false allows self-signed certs (common on Railway).
  // In production with a trusted CA you'd set this to true.
  ssl: {
    rejectUnauthorized: false,
  },
});

// Listen for unexpected errors on idle clients.
// Without this, an idle connection error would crash the Node process.
pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err.message);
  process.exit(1);
});

// Export the pool so any module can call pool.query() directly
module.exports = pool;
