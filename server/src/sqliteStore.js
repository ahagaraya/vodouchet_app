const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");

const DB_PATH = path.join(__dirname, "..", "data.sqlite");
const JSON_PATH = path.join(__dirname, "..", "data.json");

const COLLECTIONS = [
  "users",
  "categories",
  "catalogItems",
  "reviews",
  "supportMessages",
  "incomingRequests",
  "orders",
  "chatMessages",
  "auditLog",
  "pdAccessLog",
  "complaints"
];

function emptyData() {
  return {
    users: [],
    categories: [],
    catalogItems: [],
    reviews: [],
    supportMessages: [],
    incomingRequests: [],
    orders: [],
    chatMessages: [],
    auditLog: [],
    pdAccessLog: [],
    complaints: []
  };
}

let sqlite = null;

function getSqlite() {
  if (!sqlite) {
    sqlite = new DatabaseSync(DB_PATH);
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS app_collections (
        name TEXT PRIMARY KEY,
        payload TEXT NOT NULL
      )
    `);
  }
  return sqlite;
}

function loadFromSqlite() {
  const data = emptyData();
  const rows = getSqlite().prepare("SELECT name, payload FROM app_collections").all();
  for (const row of rows) {
    if (Object.prototype.hasOwnProperty.call(data, row.name)) {
      try {
        data[row.name] = JSON.parse(row.payload);
      } catch {
        data[row.name] = [];
      }
    }
  }
  return data;
}

function saveToSqlite(data) {
  const upsert = getSqlite().prepare(
    "INSERT INTO app_collections (name, payload) VALUES (?, ?) ON CONFLICT(name) DO UPDATE SET payload = excluded.payload"
  );
  getSqlite().exec("BEGIN");
  try {
    for (const name of COLLECTIONS) {
      upsert.run(name, JSON.stringify(data[name] ?? []));
    }
    getSqlite().exec("COMMIT");
  } catch (error) {
    getSqlite().exec("ROLLBACK");
    throw error;
  }
}

function importFromJsonFile() {
  if (!fs.existsSync(JSON_PATH)) return null;
  const raw = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
  const data = { ...emptyData(), ...raw };
  saveToSqlite(data);
  console.log(`[DB] Imported ${JSON_PATH} → ${DB_PATH}`);
  return data;
}

const db = {
  data: emptyData(),
  async read() {
    db.data = loadFromSqlite();
    if (db.data.users.length === 0) {
      const imported = importFromJsonFile();
      if (imported) db.data = imported;
    }
  },
  async write() {
    saveToSqlite(db.data);
  }
};

module.exports = { db, DB_PATH, JSON_PATH, emptyData, importFromJsonFile };
