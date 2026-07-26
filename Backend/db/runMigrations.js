require('dotenv').config();

const fs = require('fs');
const path = require('path');
const pool = require('./pool');

async function runMigrations() {
  const migrationsDir = path.join(__dirname, 'migrations');

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('No migration files found in db/migrations/');
    await pool.end();
    return;
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      console.log(`  → Running migration: ${file}`);
      await client.query(sql);
      console.log(`  ✅  ${file} completed`);
    }

    await client.query('COMMIT');
    console.log('\nAll migrations applied successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌  Migration failed — transaction rolled back.');
    console.error('    Error:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();
