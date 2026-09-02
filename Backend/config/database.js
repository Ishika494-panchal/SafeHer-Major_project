import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '..', 'safeher.db');

const sqlite = sqlite3.verbose();
export const db = new sqlite.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening SQLite database:', err.message);
  } else {
    console.log('📦 Connected to SQLite database at', dbPath);
  }
});

// Promisified query helpers
export const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

export const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

export const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

// Initialize database schema tables
export const initDB = async () => {
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS emergency_contacts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      relationship TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS sos_alerts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      latitude REAL NOT NULL DEFAULT 0.0,
      longitude REAL NOT NULL DEFAULT 0.0,
      battery_percent INTEGER NOT NULL DEFAULT 100,
      status TEXT NOT NULL DEFAULT 'active',
      tracking_token TEXT UNIQUE,
      triggered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ended_at DATETIME,
      resolved_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Migrate existing databases — these are no-ops if the columns already exist.
  // SQLite does not support IF NOT EXISTS for ALTER TABLE, so we swallow the error.
  const migrateColumn = async (table, column, definition) => {
    try {
      await run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
      console.log(`  ↳ Migrated: added column '${column}' to '${table}'`);
    } catch (_) {
      // Column already exists — ignore
    }
  };

  await migrateColumn('sos_alerts', 'tracking_token', 'TEXT');
  await migrateColumn('sos_alerts', 'ended_at',       'DATETIME');

  // Ensure a unique index exists on tracking_token (IF NOT EXISTS is supported)
  await run(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_sos_alerts_tracking_token
    ON sos_alerts(tracking_token)
    WHERE tracking_token IS NOT NULL
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS live_locations (
      id TEXT PRIMARY KEY,
      alert_id TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      battery_pct INTEGER DEFAULT 100,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (alert_id) REFERENCES sos_alerts(id) ON DELETE CASCADE
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS incident_reports (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      description TEXT NOT NULL,
      media_urls TEXT DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS danger_zones (
      id TEXT PRIMARY KEY,
      center_lat REAL NOT NULL,
      center_lng REAL NOT NULL,
      radius_meters REAL NOT NULL DEFAULT 300.0,
      risk_score REAL NOT NULL DEFAULT 5.0,
      report_count INTEGER NOT NULL DEFAULT 1,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('✅ SQLite database tables verified/initialized.');
};
