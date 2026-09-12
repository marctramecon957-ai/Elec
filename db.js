const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, 'db');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(path.join(dbDir, 'data.sqlite'));

db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS analyses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  photo_filename TEXT NOT NULL,
  materiaux TEXT,
  cables TEXT,
  rails TEXT,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reperages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  analysis_id INTEGER NOT NULL,
  repere TEXT NOT NULL,
  fil_amont TEXT,
  fil_aval TEXT,
  etat TEXT DEFAULT 'a_verifier',
  edite_manuellement INTEGER DEFAULT 0,
  FOREIGN KEY (analysis_id) REFERENCES analyses(id) ON DELETE CASCADE
);
`);

module.exports = db;
