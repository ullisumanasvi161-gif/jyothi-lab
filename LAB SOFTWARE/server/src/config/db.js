const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

require('dotenv').config();

const dialect = process.env.DB_DIALECT || 'sqlite';
let pool = null;
let sqliteDb = null;

if (dialect === 'postgres') {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is required when DB_DIALECT is postgres');
    process.exit(1);
  }
  const useSSL = connectionString.includes('supabase') || 
                  connectionString.includes('neon') || 
                  connectionString.includes('render.com') ||
                  connectionString.includes('sslmode=') ||
                  process.env.PGSSLMODE;
  pool = new Pool({ 
    connectionString,
    ssl: useSSL ? { rejectUnauthorized: false } : false
  });
  console.log('Database Configured: PostgreSQL');
} else {
  const dbPath = path.join(__dirname, '../../database.db');
  sqliteDb = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening SQLite database:', err.message);
    } else {
      console.log('Database Configured: SQLite at', dbPath);
    }
  });
}

// Database helper object
const db = {
  dialect,
  query: async (text, params = []) => {
    if (dialect === 'postgres') {
      const res = await pool.query(text, params);
      return res.rows;
    } else {
      return new Promise((resolve, reject) => {
        let sqliteText = text;
        const matches = text.match(/\$\d+/g);
        if (matches) {
          // Sort descending to prevent partial replacement of larger indexes ($10 replaced before $1)
          const sortedMatches = [...new Set(matches)].sort((a, b) => {
            return parseInt(b.slice(1)) - parseInt(a.slice(1));
          });
          sortedMatches.forEach((match) => {
            sqliteText = sqliteText.split(match).join('?');
          });
        }
        sqliteDb.all(sqliteText, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
    }
  },
  run: async (text, params = []) => {
    if (dialect === 'postgres') {
      const res = await pool.query(text, params);
      return { lastID: null, changes: res.rowCount };
    } else {
      return new Promise((resolve, reject) => {
        let sqliteText = text;
        const matches = text.match(/\$\d+/g);
        if (matches) {
          const sortedMatches = [...new Set(matches)].sort((a, b) => {
            return parseInt(b.slice(1)) - parseInt(a.slice(1));
          });
          sortedMatches.forEach((match) => {
            sqliteText = sqliteText.split(match).join('?');
          });
        }
        sqliteDb.run(sqliteText, params, function(err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID, changes: this.changes });
        });
      });
    }
  },
  get: async (text, params = []) => {
    const rows = await db.query(text, params);
    return rows[0] || null;
  },
  exec: async (text) => {
    if (dialect === 'postgres') {
      await pool.query(text);
    } else {
      return new Promise((resolve, reject) => {
        sqliteDb.exec(text, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
  }
};

module.exports = db;
