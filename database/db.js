const initSqlJs = require("sql.js");
const fs = require("fs");
const path = require("path");

const DB_FILE = path.join(__dirname, "../data/database.sqlite");

let SQL;
let db;

async function initDB() {
  SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    const fileBuffer = fs.readFileSync(DB_FILE);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  createTables();
  runMigrations();
  saveDB();

  return db;
}

function createTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      telegram_id TEXT PRIMARY KEY,
      username TEXT,
      role TEXT DEFAULT 'user',
      balance INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS servers (
      code TEXT PRIMARY KEY,
      name TEXT,
      api_url TEXT,
      api_key TEXT,
      domain TEXT,
      ip TEXT,
      isp TEXT,
      city TEXT,
      quota INTEGER DEFAULT 0,
      ip_limit INTEGER DEFAULT 0,
      price INTEGER DEFAULT 0,
      max_accounts INTEGER DEFAULT 100,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_id TEXT,
      server_code TEXT,
      protocol TEXT,
      username TEXT,
      password TEXT,
      uuid TEXT,
      expired_at TEXT,
      expired_text TEXT,
      config_json TEXT,
      status TEXT DEFAULT 'active',
      price INTEGER DEFAULT 0,
      days INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_id TEXT,
      type TEXT,
      amount INTEGER,
      status TEXT,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS deposits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_id TEXT,
      transaction_id TEXT,
      order_id TEXT,
      amount INTEGER,
      status TEXT DEFAULT 'pending',
      checkout_url TEXT,
      qr_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`
  CREATE TABLE IF NOT EXISTS trial_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id TEXT,
    protocol TEXT,
    server_code TEXT,
    username TEXT,
    created_date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

  db.run(`
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id TEXT,
    username TEXT,
    type TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);
}

function runMigrations() {
  addColumnIfNotExists("accounts", "password", "TEXT");
  addColumnIfNotExists("accounts", "expired_text", "TEXT");
  addColumnIfNotExists("accounts", "config_json", "TEXT");
  addColumnIfNotExists("accounts", "status", "TEXT DEFAULT 'active'");
  addColumnIfNotExists("accounts", "price", "INTEGER DEFAULT 0");
  addColumnIfNotExists("accounts", "days", "INTEGER DEFAULT 0");

  addColumnIfNotExists("deposits", "telegram_id", "TEXT");
  addColumnIfNotExists("deposits", "transaction_id", "TEXT");
  addColumnIfNotExists("deposits", "order_id", "TEXT");
  addColumnIfNotExists("deposits", "amount", "INTEGER");
  addColumnIfNotExists("deposits", "qris_message_id", "INTEGER");
  addColumnIfNotExists("deposits", "status", "TEXT DEFAULT 'pending'");
  addColumnIfNotExists(
  "notifications",
  "telegram_id",
  "TEXT"
);
  addColumnIfNotExists("deposits", "checkout_url", "TEXT");
  addColumnIfNotExists("deposits", "qr_url", "TEXT");
}

function addColumnIfNotExists(table, column, definition) {
  try {
    db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition};`);
  } catch (e) {
    // Column sudah ada, aman diabaikan.
  }
}

function getDB() {
  return db;
}

function saveDB() {
  const data = db.export();
  fs.writeFileSync(DB_FILE, Buffer.from(data));
}

module.exports = {
  initDB,
  getDB,
  saveDB
};