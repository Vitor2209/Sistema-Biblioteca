import express from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { db, DB_FILE, nowIso, logAction } from "./db.js";

const app = express();
const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOAD_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);
const upload = multer({ dest: UPLOAD_DIR });

const BACKUP_DIR = path.join(__dirname, "backups");
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR);

app.use(express.json());
app.use(
  session({
    secret: "biblioteca-offline-secret-change-this",
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true },
  })
);

app.use(express.static(path.join(__dirname, "public")));

// ===== Helpers =====
function requireAuth(req, res, next) {
  if (!req.session?.user) return res.status(401).json({ error: "NOT_AUTHENTICATED" });
  next();
}
function requireAdmin(req, res, next) {
  if (!req.session?.user) return res.status(401).json({ error: "NOT_AUTHENTICATED" });
  if (req.session.user.role !== "admin") return res.status(403).json({ error: "FORBIDDEN" });
  next();
}

// ===== Default users =====
async function ensureDefaultUsers() {
  const count = db.prepare("SELECT COUNT(*) as c FROM users").get().c;
  if (count > 0) return;

  const adminHash = await bcrypt.hash("admin123", 10);
  db.prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'admin')").run("admin", adminHash);

  const staffHash = await bcrypt.hash("staff123", 10);
  db.prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'staff')").run("bibliotecario", staffHash);

  console.log("✅ Usuários criados:");
  console.log(" - admin / admin123 (admin)");
  console.log(" - bibliotecario / staff123 (staff)");
}
await ensureDefaultUsers();

// ===== Backups =====
function backupNow(reason = "AUTO") {
  try {
    const stamp = new Date().toISOString().replaceAll(":", "-").slice(0, 19);
    const filename = `${stamp}-${reason}.sqlite`;
    const dest = path.join(BACKUP_DIR, filename);
    fs.copyFileSync(path.join(__dirname, DB_FILE), dest);
    return { ok: true, filename };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
}
// Backup on boot + every 6 hours
backupNow("BOOT");
setInterval(() => backupNow("AUTO"), 6 * 60 * 60 * 1000);

// ===== Auth =====
app.get("/api/me", (req, res) => res.json({ user: req.session.user ?? null }));

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) return res.status(400).json({ error: "MISSING_FIELDS" });

  const user = db.prepare("SELECT id, username, password_hash, role FROM users WHERE username = ?").get(username);
  if (!user) return res.status(401).json({ error: "INVALID_CREDENTIALS" });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "INVALID_CREDENTIALS" });

  req.session.user = { id: user.id, username: user.username, role: user.role };
  logAction({ user_id: user.id, action: "LOGIN", entity: "auth", details: `username=${user.username}` });

  res.json({ ok: true, user: req.session.user });
});

app.post("/api/auth/logout", requireAuth, (req, res) => {
  logAction({ user_id: req.session.user.id, action: "LOGOUT", entity: "auth" });
  req.session.destroy(() => res.json({ ok: true }));
});

app.post("/api/user/change-password", requireAuth, async (req, res) => {
  const userId = req.session.user.id;
  const { current_password, new_password } = req.body ?? {};
  if (!current_password || !new_password) return res.status(400).json({ error: "MISSING_FIELDS" });
  if (String(new_password).length < 6) return res.status(400).json({ error: "WEAK_PASSWORD" });

  const user = db.prepare("SELECT id, password_hash FROM users WHERE id = ?").get(userId);
  const ok = await bcrypt.compare(current_password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "INVALID_CURRENT_PASSWORD" });

  const hash = await bcrypt.hash(new_password, 10);
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, userId);

  logAction({ user_id: userId, action: "CHANGE_PASSWORD", entity: "users", entity_id: userId });
  res.json({ ok: true });
});

// ===== Admin: Users management =====
app.get("/api/users", requireAdmin, (req, res) => {
  const rows = db.prepare("SELECT id, username, role, created_at FROM users ORDER BY created_at DESC").all();
  res.json(rows);
});

app.post("/api/users", requireAdmin, async (req, res) => {
  const { username, password, role } = req.body ?? {};
  if (!username?.trim() || !password) return res.status(400).json({ error: "MISSING_FIELDS" });

  const r = role === "staff" ? "staff" : "admin";
  if (String(password).length < 6) return res.status(400).json({ error: "WEAK_PASSWORD" });

  const hash = await bcrypt.hash(password, 10);

  try {
    const info = db.prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)")
      .run(username.trim(), hash, r);

    logAction({ user_id: req.session.user.id, action: "CREATE", entity: "users", entity_id: info.lastInsertRowid, details: `${username.trim()} role=${r}` });
    res.json({ ok: true, id: info.lastInsertRowid });
  } catch (e) {
    return res.status(400).json({ error: e.code || "CREATE_USER_FAILED", details: String(e.message || e) });
  }
});

app.post("/api/users/:id/reset-password", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { new_password } = req.body ?? {};
  if (!new_password) return res.status(400).json({ error: "MISSING_FIELDS" });
  if (String(new_password).length < 6) return res.status(400).json({ error: "WEAK_PASSWORD" });

  const u = db.prepare("SELECT id, username FROM users WHERE id = ?").get(id);
  if (!u) return res.status(404).json({ error: "USER_NOT_FOUND" });

  const hash = await bcrypt.hash(new_password, 10);
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, id);

  logAction({ user_id: req.session.user.id, action: "RESET_PASSWORD", entity: "users", entity_id: id, details: u.username });
  res.json({ ok: true });
});

app.post("/api/users/:id/set-role", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const role = req.body?.role === "staff" ? "staff" : "admin";

  const u = db.prepare("SELECT id, username FROM users WHERE id = ?").get(id);
  if (!u) return res.status(404).json({ error: "USER_NOT_FOUND" });

  db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, id);
  logAction({ user_id: req.session.user.id, action: "SET_ROLE", entity: "users", entity_id: id, details: `${u.username} => ${role}` });

  res.json({ ok: true });
});

app.delete("/api/users/:id", requireAdmin, (req, res) => {
  try {
    const id = Number(req.params.id);
    if (id === req.session.user.id) return res.status(400).json({ error: "CANNOT_DELETE_SELF" });

    const u = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
    if (!u) return res.status(404).json({ error: "USER_NOT_FOUND" });

    const hasLoans = db.prepare("SELECT COUNT(*) as c FROM loans WHERE user_id = ?").get(id).c;
    if (hasLoans > 0) return res.status(400).json({ error: "USER_HAS_LOANS_HISTORY" });

    db.prepare("DELETE FROM users WHERE id = ?").run(id);
    logAction({ user_id: req.session.user.id, action: "DELETE", entity: "users", entity_id: id, details: u.username });

    res.json({ ok: true });
  } catch (e) {
    return res.status(400).json({ error: e.code || "DELETE_FAILED", details: String(e.message || e) });
  }
});

// ===== People =====
app.get("/api/people", requireAuth, (req, res) => {
  const q = (req.query.q ?? "").toString().trim();
  const rows = q
    ? db.prepare("SELECT * FROM people WHERE name LIKE ? ORDER BY name LIMIT 200").all(`%${q}%`)
    : db.prepare("SELECT * FROM people ORDER BY created_at DESC LIMIT 200").all();
  res.json(rows);
});

app.post("/api/people", requireAuth, (req, res) => {
  const { name, phone, email } = req.body ?? {};
  if (!name?.trim()) return res.status(400).json({ error: "NAME_REQUIRED" });

  const emailNorm = (email ?? "").toString().trim();
  const emailLower = emailNorm ? emailNorm.toLowerCase() : "";

  // Enforce unique email (case-insensitive) when provided
  if (emailLower) {
    const existing = db.prepare("SELECT id, name, email FROM people WHERE lower(trim(email)) = ? LIMIT 1").get(emailLower);
    if (existing) {
      return res.status(400).json({
        error: "EMAIL_ALREADY_EXISTS",
        details: `Já existe: ${existing.name} (${existing.email})`
      });
    }
  }

  try {
    const info = db.prepare("INSERT INTO people (name, phone, email) VALUES (?, ?, ?)")
      .run(name.trim(), phone?.trim() || null, emailNorm || null);

    logAction({ user_id: req.session.user.id, action: "CREATE", entity: "people", entity_id: info.lastInsertRowid, details: name.trim() });
    res.json({ ok: true, id: info.lastInsertRowid });
  } catch (e) {
    return res.status(400).json({ error: e.code || "CREATE_FAILED", details: String(e.message || e) });
  }
});

// ===== Books =====
app.get("/api/books", requireAuth, (req, res) => {
  const q = (req.query.q ?? "").toString().trim();
  const where = [];
  const params = [];
  if (q) { where.push("(title LIKE ? OR author LIKE ?)"); params.push(`%${q}%`, `%${q}%`); }

  const sql = `
    SELECT * FROM books
    ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY created_at DESC
    LIMIT 400
  `;
  res.json(db.prepare(sql).all(...params));
});

app.post("/api/books", requireAuth, (req, res) => {
  const { title, author, category, section, shelf, total_qty } = req.body ?? {};
  if (!title?.trim()) return res.status(400).json({ error: "TITLE_REQUIRED" });

  const total = Math.max(0, Number(total_qty ?? 0) || 0);
  const info = db.prepare(`
    INSERT INTO books (title, author, category, section, shelf, total_qty, available_qty)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    title.trim(),
    author?.trim() || null,
    category?.trim() || null,
    section?.trim() || null,
    shelf?.trim() || null,
    total,
    total
  );

  logAction({ user_id: req.session.user.id, action: "CREATE", entity: "books", entity_id: info.lastInsertRowid, details: title.trim() });
  res.json({ ok: true, id: info.lastInsertRowid });
});

app.post("/api/books/:id/adjust", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const delta = Number(req.body?.delta ?? 0) || 0;

  const book = db.prepare("SELECT * FROM books WHERE id = ?").get(id);
  if (!book) return res.status(404).json({ error: "BOOK_NOT_FOUND" });

  const newTotal = Math.max(0, book.total_qty + delta);
  const borrowed = book.total_qty - book.available_qty;
  const newAvailable = Math.max(0, newTotal - borrowed);

  db.prepare("UPDATE books SET total_qty = ?, available_qty = ? WHERE id = ?").run(newTotal, newAvailable, id);
  logAction({ user_id: req.session.user.id, action: "ADJUST_STOCK", entity: "books", entity_id: id, details: `delta=${delta}` });

  res.json({ ok: true });
});

app.delete("/api/books/:id", requireAuth, (req, res) => {
  try {
    const id = Number(req.params.id);
    const book = db.prepare("SELECT * FROM books WHERE id = ?").get(id);
    if (!book) return res.status(404).json({ error: "BOOK_NOT_FOUND" });

    const used = db.prepare("SELECT COUNT(*) as c FROM loan_items WHERE book_id = ?").get(id).c;
    if (used > 0) return res.status(400).json({ error: "BOOK_HAS_LOANS_HISTORY" });

    db.prepare("DELETE FROM books WHERE id = ?").run(id);
    logAction({ user_id: req.session.user.id, action: "DELETE", entity: "books", entity_id: id, details: book.title });

    res.json({ ok: true });
  } catch (e) {
    return res.status(400).json({ error: e.code || "DELETE_FAILED", details: String(e.message || e) });
  }
});

// ===== Loans =====
const MAX_ACTIVE_BOOKS_PER_PERSON = 3;

function getActiveBorrowedCount(person_id) {
  const row = db.prepare(`
    SELECT COALESCE(SUM(li.qty - li.returned_qty), 0) as borrowed
    FROM loans l
    JOIN loan_items li ON li.loan_id = l.id
    WHERE l.person_id = ?
      AND l.status = 'LOANED'
  `).get(person_id);
  return Number(row?.borrowed ?? 0);
}

app.post("/api/loans", requireAuth, (req, res) => {
  const { person_id, due_date, notes, items } = req.body ?? {};
  if (!person_id) return res.status(400).json({ error: "PERSON_REQUIRED" });
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: "ITEMS_REQUIRED" });

  const person = db.prepare("SELECT * FROM people WHERE id = ?").get(person_id);
  if (!person) return res.status(404).json({ error: "PERSON_NOT_FOUND" });

  const activeBorrowed = getActiveBorrowedCount(person_id);
  const requested = items.reduce((s, it) => s + Math.max(1, Number(it.qty ?? 1) || 1), 0);
  if (activeBorrowed + requested > MAX_ACTIVE_BOOKS_PER_PERSON) {
    return res.status(400).json({ error: "LIMIT_REACHED", limit: MAX_ACTIVE_BOOKS_PER_PERSON, current: activeBorrowed, requested });
  }

  for (const it of items) {
    const bookId = Number(it.book_id);
    const qty = Math.max(1, Number(it.qty ?? 1) || 1);
    const book = db.prepare("SELECT * FROM books WHERE id = ?").get(bookId);
    if (!book) return res.status(404).json({ error: "BOOK_NOT_FOUND", book_id: bookId });
    if (book.available_qty < qty) {
      return res.status(400).json({
        error: "INSUFFICIENT_STOCK",
        book: { id: book.id, title: book.title, available: book.available_qty },
        requested: qty,
      });
    }
  }

  const createLoan = db.transaction(() => {
    const userId = req.session.user.id;

    const info = db.prepare(`
      INSERT INTO loans (person_id, user_id, loan_date, due_date, status, notes)
      VALUES (?, ?, ?, ?, 'LOANED', ?)
    `).run(person_id, userId, nowIso(), due_date?.trim() || null, notes?.trim() || null);

    const loanId = info.lastInsertRowid;

    for (const it of items) {
      const bookId = Number(it.book_id);
      const qty = Math.max(1, Number(it.qty ?? 1) || 1);
      const book = db.prepare("SELECT * FROM books WHERE id = ?").get(bookId);

      db.prepare("UPDATE books SET available_qty = available_qty - ? WHERE id = ?").run(qty, bookId);
      db.prepare("INSERT INTO loan_items (loan_id, book_id, qty, shelf, returned_qty) VALUES (?, ?, ?, ?, 0)")
        .run(loanId, bookId, qty, book.shelf || null);
    }

    logAction({ user_id: userId, action: "CREATE", entity: "loans", entity_id: loanId, details: `person=${person.name} items=${items.length}` });
    return loanId;
  });

  res.json({ ok: true, loan_id: createLoan() });
});

app.get("/api/loans", requireAuth, (req, res) => {
  const status = (req.query.status ?? "").toString().trim();
  const overdue = (req.query.overdue ?? "").toString().trim();
  const q = (req.query.q ?? "").toString().trim();

  const where = [];
  const params = [];
  if (status) { where.push("l.status = ?"); params.push(status); }
  if (q) { where.push("p.name LIKE ?"); params.push(`%${q}%`); }
  if (overdue === "1") where.push("l.status='LOANED' AND l.due_date IS NOT NULL AND l.due_date < datetime('now')");

  const sql = `
    SELECT l.*, p.name as person_name, u.username as user_username, u.role as user_role
    FROM loans l
    JOIN people p ON p.id = l.person_id
    JOIN users u ON u.id = l.user_id
    ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY l.loan_date DESC
    LIMIT 300
  `;

  const rows = db.prepare(sql).all(...params);
  const getItems = db.prepare(`
    SELECT li.*, b.title, b.author
    FROM loan_items li
    JOIN books b ON b.id = li.book_id
    WHERE li.loan_id = ?
  `);

  res.json(rows.map((r) => ({ ...r, items: getItems.all(r.id) })));
});

app.post("/api/loans/:id/renew", requireAuth, (req, res) => {
  const loanId = Number(req.params.id);
  const { due_date } = req.body ?? {};
  if (!due_date?.trim()) return res.status(400).json({ error: "DUE_DATE_REQUIRED" });

  const loan = db.prepare("SELECT * FROM loans WHERE id = ?").get(loanId);
  if (!loan) return res.status(404).json({ error: "LOAN_NOT_FOUND" });
  if (loan.status !== "LOANED") return res.status(400).json({ error: "NOT_ACTIVE" });

  db.prepare("UPDATE loans SET due_date = ? WHERE id = ?").run(due_date.trim(), loanId);
  logAction({ user_id: req.session.user.id, action: "RENEW", entity: "loans", entity_id: loanId, details: `due=${due_date.trim()}` });

  res.json({ ok: true });
});

app.post("/api/loans/:id/return-item", requireAuth, (req, res) => {
  const loanId = Number(req.params.id);
  const { loan_item_id, qty } = req.body ?? {};
  const qReturn = Math.max(1, Number(qty ?? 1) || 1);

  const loan = db.prepare("SELECT * FROM loans WHERE id = ?").get(loanId);
  if (!loan) return res.status(404).json({ error: "LOAN_NOT_FOUND" });
  if (loan.status !== "LOANED") return res.status(400).json({ error: "NOT_ACTIVE" });

  const item = db.prepare("SELECT * FROM loan_items WHERE id = ? AND loan_id = ?").get(Number(loan_item_id), loanId);
  if (!item) return res.status(404).json({ error: "ITEM_NOT_FOUND" });

  const remaining = item.qty - item.returned_qty;
  if (qReturn > remaining) return res.status(400).json({ error: "RETURN_QTY_TOO_HIGH", remaining });

  const tx = db.transaction(() => {
    db.prepare("UPDATE loan_items SET returned_qty = returned_qty + ? WHERE id = ?").run(qReturn, item.id);
    db.prepare("UPDATE books SET available_qty = available_qty + ? WHERE id = ?").run(qReturn, item.book_id);

    const left = db.prepare("SELECT COALESCE(SUM(qty - returned_qty),0) as left FROM loan_items WHERE loan_id = ?")
      .get(loanId).left;

    if (Number(left) === 0) {
      db.prepare("UPDATE loans SET status='RETURNED', return_date=? WHERE id=?").run(nowIso(), loanId);
    }
  });

  tx();
  logAction({ user_id: req.session.user.id, action: "RETURN_ITEM", entity: "loans", entity_id: loanId, details: `item=${item.id} qty=${qReturn}` });

  res.json({ ok: true });
});

app.post("/api/loans/:id/return", requireAuth, (req, res) => {
  const loanId = Number(req.params.id);

  const loan = db.prepare("SELECT * FROM loans WHERE id = ?").get(loanId);
  if (!loan) return res.status(404).json({ error: "LOAN_NOT_FOUND" });
  if (loan.status !== "LOANED") return res.status(400).json({ error: "ALREADY_RETURNED" });

  const items = db.prepare("SELECT * FROM loan_items WHERE loan_id = ?").all(loanId);

  const tx = db.transaction(() => {
    for (const it of items) {
      const remaining = it.qty - it.returned_qty;
      if (remaining > 0) {
        db.prepare("UPDATE books SET available_qty = available_qty + ? WHERE id = ?").run(remaining, it.book_id);
        db.prepare("UPDATE loan_items SET returned_qty = qty WHERE id = ?").run(it.id);
      }
    }
    db.prepare("UPDATE loans SET status='RETURNED', return_date=? WHERE id=?").run(nowIso(), loanId);
  });

  tx();
  logAction({ user_id: req.session.user.id, action: "RETURN_ALL", entity: "loans", entity_id: loanId });

  res.json({ ok: true });
});

// ===== Logs =====
app.get("/api/logs", requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT al.*, u.username as user_username, u.role as user_role
    FROM audit_logs al
    LEFT JOIN users u ON u.id = al.user_id
    ORDER BY al.created_at DESC
    LIMIT 300
  `).all();
  res.json(rows);
});

// ===== Backup endpoints =====
app.get("/api/backups", requireAdmin, (req, res) => {
  const files = fs.readdirSync(BACKUP_DIR)
    .filter((f) => f.endsWith(".sqlite"))
    .sort()
    .reverse()
    .slice(0, 200)
    .map((f) => ({ file: f }));
  res.json(files);
});

app.get("/api/backups/download/:file", requireAdmin, (req, res) => {
  const file = req.params.file;
  const full = path.join(BACKUP_DIR, file);
  if (!fs.existsSync(full)) return res.status(404).json({ error: "BACKUP_NOT_FOUND" });
  res.download(full, file);
});

app.post("/api/backup/now", requireAdmin, (req, res) => {
  const r = backupNow("MANUAL");
  if (!r.ok) return res.status(500).json({ error: "BACKUP_FAILED", details: r.error });
  logAction({ user_id: req.session.user.id, action: "BACKUP_NOW", entity: "backup", details: r.filename });
  res.json({ ok: true, file: r.filename });
});

app.post("/api/backup/restore", requireAdmin, upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "FILE_REQUIRED" });

  const dest = path.join(__dirname, `${DB_FILE}.restored`);
  fs.copyFileSync(req.file.path, dest);
  fs.unlinkSync(req.file.path);

  logAction({ user_id: req.session.user.id, action: "RESTORE_UPLOADED", entity: "backup", details: `saved_as=${DB_FILE}.restored` });

  res.json({
    ok: true,
    message:
      `Backup recebido. Foi salvo como "${DB_FILE}.restored". ` +
      `Agora pare o servidor e renomeie esse arquivo para "${DB_FILE}" e inicie novamente.`,
  });
});

// ===== CSV Reports =====
function csvEscape(v) {
  const s = String(v ?? "");
  if (s.includes('"') || s.includes(",") || s.includes("\n")) return `"${s.replaceAll('"', '""')}"`;
  return s;
}
function sendCsv(res, filename, header, rows) {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  const lines = [];
  lines.push(header.join(","));
  for (const r of rows) lines.push(r.map(csvEscape).join(","));
  res.send(lines.join("\n"));
}

app.get("/api/reports/books.csv", requireAuth, (req, res) => {
  const rows = db.prepare("SELECT * FROM books ORDER BY created_at DESC").all();
  sendCsv(res, "books.csv",
    ["id","title","author","category","section","shelf","total_qty","available_qty","created_at"],
    rows.map((b) => [b.id,b.title,b.author,b.category,b.section,b.shelf,b.total_qty,b.available_qty,b.created_at])
  );
});

app.get("/api/reports/people.csv", requireAuth, (req, res) => {
  const rows = db.prepare("SELECT * FROM people ORDER BY created_at DESC").all();
  sendCsv(res, "people.csv",
    ["id","name","phone","email","created_at"],
    rows.map((p) => [p.id,p.name,p.phone,p.email,p.created_at])
  );
});

app.get("/api/reports/loans.csv", requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT l.*, p.name as person_name, u.username as user_username
    FROM loans l
    JOIN people p ON p.id = l.person_id
    JOIN users u ON u.id = l.user_id
    ORDER BY l.loan_date DESC
  `).all();

  sendCsv(res, "loans.csv",
    ["id","person_name","user","status","loan_date","due_date","return_date","notes"],
    rows.map((l) => [l.id,l.person_name,l.user_username,l.status,l.loan_date,l.due_date,l.return_date,l.notes])
  );
});

app.get("/api/reports/overdue.csv", requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT l.*, p.name as person_name, u.username as user_username
    FROM loans l
    JOIN people p ON p.id = l.person_id
    JOIN users u ON u.id = l.user_id
    WHERE l.status='LOANED' AND l.due_date IS NOT NULL AND l.due_date < datetime('now')
    ORDER BY l.due_date ASC
  `).all();

  sendCsv(res, "overdue.csv",
    ["id","person_name","user","loan_date","due_date","notes"],
    rows.map((l) => [l.id,l.person_name,l.user_username,l.loan_date,l.due_date,l.notes])
  );
});

// SPA fallback
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => console.log(`✅ Rodando offline em http://localhost:${PORT}`));
