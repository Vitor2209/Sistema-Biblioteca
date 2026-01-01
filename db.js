import Database from "better-sqlite3";

export const DB_FILE = "database.sqlite";
export const db = new Database(DB_FILE);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

export function nowIso() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const YYYY = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const DD = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${YYYY}-${MM}-${DD} ${hh}:${mm}:${ss}`;
}

function hasColumn(table, col) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  return cols.some((c) => c.name === col);
}

function migrate() {
  // Users (new auth)
  db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin', -- admin | staff
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `).run();

  // Legacy admins (kept for safety; we migrate if present)
  db.prepare(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `).run();

  // People
  db.prepare(`
    CREATE TABLE IF NOT EXISTS people (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `).run();

  // Unique email for people (case-insensitive, allows multiple NULLs)
  // Partial UNIQUE index: only enforces uniqueness when email is present and not empty.
  // NOTE: If your database already has duplicated emails, this UNIQUE index cannot be created.
  // We try to create it; if it fails, the API validation will still prevent new duplicates.
  try {
    db.prepare(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_people_email_unique
      ON people(lower(trim(email)))
      WHERE email IS NOT NULL AND trim(email) <> ''
    `).run();
  } catch (e) {
    console.warn("⚠️ Não foi possível criar índice UNIQUE de email (provavelmente já existe email duplicado no banco).");
    console.warn("   Resolva removendo/ajustando duplicados e reinicie para aplicar o índice.");
  }

  // Books
  db.prepare(`
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT,
      category TEXT,
      section TEXT,
      shelf TEXT,
      total_qty INTEGER NOT NULL DEFAULT 0,
      available_qty INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `).run();

  // Loans
  db.prepare(`
    CREATE TABLE IF NOT EXISTS loans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      person_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      loan_date TEXT NOT NULL DEFAULT (datetime('now')),
      due_date TEXT,
      return_date TEXT,
      status TEXT NOT NULL DEFAULT 'LOANED', -- LOANED | RETURNED
      notes TEXT,
      FOREIGN KEY(person_id) REFERENCES people(id),
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `).run();

  // Loan items
  db.prepare(`
    CREATE TABLE IF NOT EXISTS loan_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      loan_id INTEGER NOT NULL,
      book_id INTEGER NOT NULL,
      qty INTEGER NOT NULL DEFAULT 1,
      shelf TEXT,
      returned_qty INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY(loan_id) REFERENCES loans(id),
      FOREIGN KEY(book_id) REFERENCES books(id)
    )
  `).run();

  // Audit logs
  db.prepare(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id INTEGER,
      details TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `).run();

  // ===== MIGRATIONS =====

  // If users empty, migrate first legacy admin into users
  const userCount = db.prepare("SELECT COUNT(*) as c FROM users").get().c;
  if (userCount === 0) {
    const legacy = db.prepare("SELECT * FROM admins ORDER BY id ASC LIMIT 1").get();
    if (legacy) {
      db.prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'admin')")
        .run(legacy.username, legacy.password_hash);
    }
  }

  // Older schema: loans had admin_id
  if (hasColumn("loans", "admin_id") && !hasColumn("loans", "user_id")) {
    db.prepare(`ALTER TABLE loans ADD COLUMN user_id INTEGER`).run();
    db.prepare(`UPDATE loans SET user_id = 1 WHERE user_id IS NULL`).run();
  }

  // Older schema: loan_items missing returned_qty
  if (!hasColumn("loan_items", "returned_qty")) {
    db.prepare(`ALTER TABLE loan_items ADD COLUMN returned_qty INTEGER NOT NULL DEFAULT 0`).run();
  }

  // Soft delete support (people/books)
  if (!hasColumn("people", "deleted_at")) {
    db.prepare(`ALTER TABLE people ADD COLUMN deleted_at TEXT`).run();
  }
  if (!hasColumn("books", "deleted_at")) {
    db.prepare(`ALTER TABLE books ADD COLUMN deleted_at TEXT`).run();
  }

}
migrate();

export function logAction({ user_id, action, entity, entity_id = null, details = null }) {
  db.prepare(`
    INSERT INTO audit_logs (user_id, action, entity, entity_id, details, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(user_id ?? null, action, entity, entity_id, details, nowIso());
}
