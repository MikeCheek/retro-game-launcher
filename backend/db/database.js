const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const DB_PATH = path.join(__dirname, '../../data.db');

let SQL;
let db;
let initPromise;

async function initializeEngine() {
  if (SQL) return SQL;

  SQL = await initSqlJs({
    locateFile: (file) => path.join(__dirname, '../../node_modules/sql.js/dist', file),
  });

  return SQL;
}

function persistDatabase() {
  if (!db) return;
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

async function getDatabase() {
  if (db) {
    return db;
  }

  if (!initPromise) {
    initPromise = (async () => {
      const SqlJs = await initializeEngine();

      if (fs.existsSync(DB_PATH)) {
        const fileBuffer = fs.readFileSync(DB_PATH);
        db = new SqlJs.Database(fileBuffer);
      } else {
        db = new SqlJs.Database();
      }

      db.run('PRAGMA foreign_keys = ON');
      console.log('Connected to SQLite database (sql.js)');
      return db;
    })();
  }

  return initPromise;
}

function run(sql, params = []) {
  return (async () => {
    try {
      const database = await getDatabase();
      database.run(sql, params);

      const result = database.exec('SELECT last_insert_rowid() AS id, changes() AS changes');
      const values = result?.[0]?.values?.[0] || [null, 0];

      persistDatabase();
      return { id: values[0], changes: values[1] };
    } catch (err) {
      console.error('SQL error:', err);
      throw err;
    }
  })();
}

function get(sql, params = []) {
  return (async () => {
    const database = await getDatabase();
    const stmt = database.prepare(sql, params);

    try {
      if (!stmt.step()) {
        return undefined;
      }
      return stmt.getAsObject();
    } finally {
      stmt.free();
    }
  })();
}

function all(sql, params = []) {
  return (async () => {
    const database = await getDatabase();
    const stmt = database.prepare(sql, params);
    const rows = [];

    try {
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      return rows;
    } finally {
      stmt.free();
    }
  })();
}

async function initializeDatabase() {
  try {
    // Users table
    await run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME
      )
    `);

    // ROMs table
    await run(`
      CREATE TABLE IF NOT EXISTS roms (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        filename TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_type TEXT NOT NULL,
        game_type TEXT NOT NULL,
        file_size INTEGER,
        md5_hash TEXT,
        cover_image TEXT,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_played DATETIME,
        times_played INTEGER DEFAULT 0,
        FOREIGN KEY(user_id) REFERENCES users(id),
        UNIQUE(user_id, md5_hash)
      )
    `);

    // Save states table
    await run(`
      CREATE TABLE IF NOT EXISTS save_states (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        rom_id TEXT NOT NULL,
        slot_number INTEGER NOT NULL,
        state_data BLOB NOT NULL,
        screenshot TEXT,
        game_time DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(rom_id) REFERENCES roms(id),
        UNIQUE(user_id, rom_id, slot_number)
      )
    `);

    // Sessions table (for cross-device sync)
    await run(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        device_id TEXT NOT NULL,
        device_name TEXT,
        last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
      )
    `);

    // Create indexes
    await run('CREATE INDEX IF NOT EXISTS idx_roms_user_id ON roms(user_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_save_states_user_id ON save_states(user_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_save_states_rom_id ON save_states(rom_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)');

    console.log('Database initialized successfully');
  } catch (err) {
    console.error('Error initializing database:', err);
    throw err;
  }
}

module.exports = {
  getDatabase,
  initializeDatabase,
  run,
  get,
  all,
};
