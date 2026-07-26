const pool = require('./pool');

async function testConnection() {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query('SELECT NOW() AS current_time');
    console.log('✅  PostgreSQL connection successful!');
    console.log('    Server time:', result.rows[0].current_time);
  } catch (err) {
    console.error('❌  PostgreSQL connection failed:', err.message);
    process.exitCode = 1;
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

testConnection();
