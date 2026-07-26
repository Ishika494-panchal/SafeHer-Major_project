require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function verify() {
  try {
    // 1. Columns
    const cols = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'sos_alerts'
      ORDER BY ordinal_position
    `);
    console.log('\n── sos_alerts columns ──');
    cols.rows.forEach(c =>
      console.log(` ✅ ${c.column_name.padEnd(14)} | ${c.data_type.padEnd(24)} | nullable: ${c.is_nullable}`)
    );

    // 2. CHECK constraints
    const checks = await pool.query(`
      SELECT conname, pg_get_constraintdef(oid) AS definition
      FROM pg_constraint
      WHERE conrelid = 'sos_alerts'::regclass AND contype = 'c'
    `);
    console.log('\n── sos_alerts CHECK constraints ──');
    checks.rows.forEach(c => console.log(` ✅ ${c.conname}\n    ${c.definition}`));

    // 3. Foreign keys
    const fks = await pool.query(`
      SELECT conname, pg_get_constraintdef(oid) AS definition
      FROM pg_constraint
      WHERE conrelid = 'sos_alerts'::regclass AND contype = 'f'
    `);
    console.log('\n── sos_alerts foreign keys ──');
    fks.rows.forEach(f => console.log(` ✅ ${f.conname}\n    ${f.definition}`));

    // 4. Indexes
    const idxs = await pool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'sos_alerts' AND indexname NOT LIKE '%pkey'
    `);
    console.log('\n── sos_alerts indexes ──');
    idxs.rows.forEach(i => console.log(` ✅ ${i.indexname}\n    ${i.indexdef}`));

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}
verify();
