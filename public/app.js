// Biblioteca Offline - Front (SPA) - Vanilla JS
// IMPORTANT: Prefer abrir em http://localhost:3000 (mesma porta do Node)
// Se você abrir em outra porta (Live Server), cookies de sessão podem não funcionar.

const API_BASE = (location.port && location.port !== "3000") ? "http://localhost:3000" : "";

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

function toast(msg, kind = "info") {
  const el = $("#toast");
  if (!el) return alert(msg);
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2300);
}

async function api(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    ...opts,
  });
  let data = null;
  try { data = await res.json(); } catch { /* ignore */ }
  if (!res.ok) {
    const err = data?.error || `HTTP_${res.status}`;
    const details = data?.details ? ` (${data.details})` : "";
    throw new Error(`${err}${details}`);
  }
  return data;
}

async function apiForm(path, formData, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, { method: "POST", body: formData, ...opts });
  let data = null;
  try { data = await res.json(); } catch { /* ignore */ }
  if (!res.ok) {
    const err = data?.error || `HTTP_${res.status}`;
    throw new Error(err);
  }
  return data;
}


function debounce(fn, ms = 250) {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

/* ========= Theme ========= */
function applyTheme(t) {
  document.documentElement.setAttribute("data-theme", t);
  localStorage.setItem("theme", t);
}
applyTheme(localStorage.getItem("theme") || "dark");
$("#btnTheme")?.addEventListener("click", () => {
  const cur = document.documentElement.getAttribute("data-theme") || "dark";
  applyTheme(cur === "dark" ? "light" : "dark");
});

/* ========= Sidebar (mobile) ========= */
const sidebar = $("#sidebar");
const backdrop = $("#backdrop");
function openSidebar() {
  sidebar?.classList.add("is-open");
  backdrop?.classList.add("is-open");
}
function closeSidebar() {
  sidebar?.classList.remove("is-open");
  backdrop?.classList.remove("is-open");
}
$("#btnHamburger")?.addEventListener("click", () => {
  if (sidebar?.classList.contains("is-open")) closeSidebar();
  else openSidebar();
});
backdrop?.addEventListener("click", closeSidebar);

/* ========= Views ========= */
const views = {
  login: $("#viewLogin"),
  dashboard: $("#viewDash"),
  books: $("#viewBooks"),
  people: $("#viewPeople"),
  loans: $("#viewLoans"),
  reports: $("#viewReports"),
  settings: $("#viewSettings"),
  users: $("#viewUsers"),
  logs: $("#viewLogs"),
};

function showOnly(viewKey) {
  Object.entries(views).forEach(([k, el]) => {
    if (!el) return;
    el.style.display = (k === viewKey) ? "" : "none";
  });
}

const pageTitle = $("#pageTitle");
const pageSubtitle = $("#pageSubtitle");

const navMeta = {
  dashboard: { title: "Dashboard", subtitle: "Visão geral do sistema" },
  books: { title: "Livros", subtitle: "Cadastro, ajuste e remoção" },
  people: { title: "Pessoas", subtitle: "Cadastro e remoção segura" },
  loans: { title: "Empréstimos", subtitle: "Ativos, devoluções e atrasados" },
  reports: { title: "Relatórios", subtitle: "Exportação CSV + PDF" },
  settings: { title: "Configurações", subtitle: "Senha e backups" },
  users: { title: "Usuários", subtitle: "Gerenciar admin e bibliotecários" },
  logs: { title: "Logs", subtitle: "Auditoria do sistema" },
};

function setActiveNav(key) {
  $$(".nav-item").forEach((b) => b.classList.toggle("is-active", b.dataset.nav === key));
  pageTitle.textContent = navMeta[key]?.title || "Biblioteca";
  pageSubtitle.textContent = navMeta[key]?.subtitle || "";
}

/* ========= State ========= */
let ME = null;
let BOOKS = [];
let PEOPLE = [];
let LOANS = [];
let OVERDUE_ONLY = false;

/* ========= Auth ========= */
async function refreshMe() {
  const me = await api("/api/me");
  ME = me.user;
  if (!ME) return null;

  $("#userName").textContent = ME.username;
  $("#userRole").textContent = ME.role;
  const av = ($("#userChip .avatar") || $(".avatar"));
  if (av) av.textContent = (ME.username?.[0] || "U").toUpperCase();

  $$(".admin-only").forEach((el) => (el.style.display = (ME.role === "admin") ? "" : "none"));
  return ME;
}

$("#btnLogout")?.addEventListener("click", async () => {
  try {
    await api("/api/auth/logout", { method: "POST" });
  } catch {}
  ME = null;
  toast("Saiu do sistema.");
  boot();
});

$("#loginForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const username = String(fd.get("username") || "").trim();
  const password = String(fd.get("password") || "");
  try {
    await api("/api/auth/login", { method: "POST", body: JSON.stringify({ username, password }) });
    await refreshMe();
    toast("Login efetuado!");
    navigate("dashboard");
    await reloadAll();
  } catch (err) {
    toast(`Falha no login: ${err.message}`);
  }
});

/* ========= Navigation ========= */
function navigate(key) {
  if (!ME) {
    showOnly("login");
    setActiveNav("dashboard");
    return;
  }

  if (key === "users" && ME.role !== "admin") {
    toast("Apenas admin pode acessar Usuários.");
    return;
  }

  showOnly(key);
  setActiveNav(key);
  closeSidebar();

  // lazy load per page
  if (key === "books") renderBooks();
  if (key === "people") renderPeople();
  if (key === "loans") renderLoans();
  if (key === "logs") renderLogs();
  if (key === "users") renderUsers();
  if (key === "settings") renderBackups();
  if (key === "dashboard") renderDashboard();
}

$$(".nav-item").forEach((btn) => {
  btn.addEventListener("click", () => navigate(btn.dataset.nav));
});

$$(".quick-btn[data-go]").forEach((btn) => {
  btn.addEventListener("click", () => navigate(btn.dataset.go));
});

/* ========= Printing ========= */
function doPrint() { window.print(); }
$("#btnPrintDash")?.addEventListener("click", doPrint);
$("#btnPrintBooks")?.addEventListener("click", doPrint);
$("#btnPrintPeople")?.addEventListener("click", doPrint);
$("#btnPrintLoans")?.addEventListener("click", doPrint);
$("#btnPrintReports")?.addEventListener("click", doPrint);

/* ========= Dashboard ========= */
function setText(id, v) { const el = $(id); if (el) el.textContent = String(v); }

function renderDashboard() {
  const totalBooks = BOOKS.reduce((s, b) => s + (Number(b.total_qty) || 0), 0);
  const avail = BOOKS.reduce((s, b) => s + (Number(b.available_qty) || 0), 0);
  const activeLoans = LOANS.filter(l => l.status === "LOANED").length;
  const overdue = LOANS.filter(l => l.status === "LOANED" && l.due_date && isOverdue(l.due_date)).length;

  setText("#kBooks", totalBooks);
  setText("#kAvail", avail);
  setText("#kLoans", activeLoans);
  setText("#kOverdue", overdue);

  drawChart();
}

function drawChart() {
  const canvas = $("#chartBooks");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width = canvas.clientWidth * devicePixelRatio;
  const H = canvas.height = 160 * devicePixelRatio;
  ctx.clearRect(0, 0, W, H);

  // compute values
  const totalBooks = BOOKS.reduce((s, b) => s + (Number(b.total_qty) || 0), 0);
  const avail = BOOKS.reduce((s, b) => s + (Number(b.available_qty) || 0), 0);
  const borrowed = Math.max(0, totalBooks - avail);

  const values = [totalBooks, avail, borrowed];
  const labels = ["Total", "Disponível", "Emprestado"];
  const maxV = Math.max(1, ...values);

  const pad = 16 * devicePixelRatio;
  const barW = (W - pad * 2) / 3.8;
  const gap = barW / 2.4;
  const baseY = H - pad * 1.4;

  // bar colors (not specified as fixed per requirement; but this is UI, okay)
  const bars = [
    { v: values[0], c: "rgba(76,156,255,.65)" },
    { v: values[1], c: "rgba(39,209,127,.60)" },
    { v: values[2], c: "rgba(255,191,76,.62)" },
  ];

  ctx.font = `${12 * devicePixelRatio}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--muted");

  bars.forEach((b, i) => {
    const x = pad + i * (barW + gap);
    const h = (b.v / maxV) * (H - pad * 3);
    const y = baseY - h;

    // bar
    ctx.fillStyle = b.c;
    roundRect(ctx, x, y, barW, h, 12 * devicePixelRatio);
    ctx.fill();

    // value
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--text");
    ctx.fillText(String(b.v), x + barW / 2, y - 6 * devicePixelRatio);

    // label
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--muted");
    ctx.fillText(labels[i], x + barW / 2, baseY + 18 * devicePixelRatio);
  });
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/* ========= Books ========= */
function esc(s) {
  return String(s ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
}

function renderBooks() {
  const q = ($("#qBooks")?.value || "").trim().toLowerCase();
  const list = $("#booksList");
  if (!list) return;

  const rows = BOOKS
    .filter(b => !q || (b.title||"").toLowerCase().includes(q) || (b.author||"").toLowerCase().includes(q))
    .slice(0, 400);

  list.innerHTML = rows.map(b => {
    const borrowed = Math.max(0, (Number(b.total_qty)||0) - (Number(b.available_qty)||0));
    return `
      <div class="item">
        <div>
          <b>${esc(b.title)}</b>
          <div class="meta">
            ${esc(b.author || "—")} • ${esc(b.category || "—")} • ${esc(b.section || "—")} • ${esc(b.shelf || "—")}
          </div>
          <div class="meta">
            <span class="badge green">Disponível: ${Number(b.available_qty)||0}</span>
            <span class="badge">Total: ${Number(b.total_qty)||0}</span>
            <span class="badge red">Emprestado: ${borrowed}</span>
          </div>
        </div>
        <div class="item-actions">
          <button class="btn" data-adjust="${b.id}" data-delta="1">+1</button>
          <button class="btn" data-adjust="${b.id}" data-delta="-1">-1</button>
          <button class="btn danger" data-delbook="${b.id}">Remover</button>
        </div>
      </div>
    `;
  }).join("") || `<div class="muted small">Nenhum livro encontrado.</div>`;
}

$("#qBooks")?.addEventListener("input", renderBooks);
$("#btnReloadBooks")?.addEventListener("click", async () => {
  const q = ($("#qBooks")?.value || "").trim();
  await loadBooks(q);
  renderBooks();
  toast("Livros atualizados.");
});

$("#bookForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const body = {
    title: fd.get("title"),
    author: fd.get("author"),
    category: fd.get("category"),
    section: fd.get("section"),
    shelf: fd.get("shelf"),
    total_qty: Number(fd.get("total_qty") || 0),
  };

  try {
    await api("/api/books", { method: "POST", body: JSON.stringify(body) });
    e.target.reset();
    await loadBooks();
    renderBooks();
    toast("Livro adicionado.");
    renderDashboard();
  } catch (err) {
    toast(`Erro ao adicionar livro: ${err.message}`);
  }
});

$("#booksList")?.addEventListener("click", async (e) => {
  const adj = e.target.closest("[data-adjust]");
  const del = e.target.closest("[data-delbook]");

  if (adj) {
    const id = adj.dataset.adjust;
    const delta = Number(adj.dataset.delta || 0);
    try {
      await api(`/api/books/${id}/adjust`, { method: "POST", body: JSON.stringify({ delta }) });
      await loadBooks();
      renderBooks();
      renderDashboard();
      toast("Estoque atualizado.");
    } catch (err) {
      toast(`Erro: ${err.message}`);
    }
  }

  if (del) {
    const id = del.dataset.delbook;
    if (!confirm("Remover este livro? (Só funciona se nunca teve empréstimo)")) return;
    try {
      await api(`/api/books/${id}`, { method: "DELETE" });
      await loadBooks();
      renderBooks();
      renderDashboard();
      toast("Livro removido.");
    } catch (err) {
      toast(`Erro ao remover livro: ${err.message}`);
    }
  }
});

/* ========= People ========= */
function renderPeople() {
  const q = ($("#qPeople")?.value || "").trim().toLowerCase();
  const list = $("#peopleList");
  if (!list) return;

  const rows = PEOPLE
    .filter(p => !q || (p.name||"").toLowerCase().includes(q))
    .slice(0, 400);

  list.innerHTML = rows.map(p => `
    <div class="item">
      <div>
        <b>${esc(p.name)}</b>
        <div class="meta">${esc(p.phone || "—")} • ${esc(p.email || "—")}</div>
        <div class="meta">Criado em: ${esc(p.created_at || "—")}</div>
      </div>
      <div class="item-actions">
        <button class="btn danger" data-delperson="${p.id}">Remover</button>
      </div>
    </div>
  `).join("") || `<div class="muted small">Nenhuma pessoa encontrada.</div>`;
}

$("#qPeople")?.addEventListener("input", renderPeople);
$("#btnReloadPeople")?.addEventListener("click", async () => {
  const q = ($("#qPeople")?.value || "").trim();
  await loadPeople(q);
  renderPeople();
  toast("Pessoas atualizadas.");
});

$("#peopleForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const body = { name: fd.get("name"), phone: fd.get("phone"), email: fd.get("email") };
  try {
    await api("/api/people", { method: "POST", body: JSON.stringify(body) });
    e.target.reset();
    await loadPeople();
    renderPeople();
    toast("Pessoa cadastrada.");
  } catch (err) {
    toast(`Erro ao cadastrar pessoa: ${err.message}`);
  }
});

$("#peopleList")?.addEventListener("click", async (e) => {
  const del = e.target.closest("[data-delperson]");
  if (!del) return;

  const id = del.dataset.delperson;
  if (!confirm("Remover esta pessoa? (Só funciona se nunca teve empréstimo)")) return;

  try {
    await api(`/api/people/${id}`, { method: "DELETE" });
    await loadPeople();
    renderPeople();
    toast("Pessoa removida.");
  } catch (err) {
    toast(`Erro ao remover pessoa: ${err.message}`);
  }
});

/* ========= Loans ========= */
function isOverdue(due) {
  // due is "YYYY-MM-DD HH:MM:SS"
  const iso = String(due).replace(" ", "T") + "Z";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return false;
  return t < Date.now();
}

function loanStatusBadge(loan) {
  if (loan.status === "RETURNED") return `<span class="badge green">Devolvido</span>`;
  if (loan.due_date && isOverdue(loan.due_date)) return `<span class="badge red">Atrasado</span>`;
  return `<span class="badge">Ativo</span>`;
}

function renderLoans() {
  const q = ($("#qLoans")?.value || "").trim().toLowerCase();
  const list = $("#loansList");
  if (!list) return;

  const filtered = LOANS
    .filter(l => !q || (l.person_name||"").toLowerCase().includes(q))
    .filter(l => !OVERDUE_ONLY || (l.status === "LOANED" && l.due_date && isOverdue(l.due_date)))
    .slice(0, 300);

  list.innerHTML = filtered.map(l => {
    const itemsHtml = (l.items || []).map(it => {
      const remaining = (Number(it.qty)||0) - (Number(it.returned_qty)||0);
      const canReturn = l.status === "LOANED" && remaining > 0;
      return `
        <div class="item" style="padding:10px;">
          <div>
            <b>${esc(it.title)}</b>
            <div class="meta">${esc(it.author || "—")} • prateleira: ${esc(it.shelf || "—")}</div>
            <div class="meta">
              <span class="badge">Qtd: ${it.qty}</span>
              <span class="badge green">Devolvido: ${it.returned_qty}</span>
              <span class="badge red">Restante: ${remaining}</span>
            </div>
          </div>
          <div class="item-actions">
            ${canReturn ? `<button class="btn" data-returnitem="${it.id}" data-loan="${l.id}" data-max="${remaining}">Devolver</button>` : ``}
          </div>
        </div>
      `;
    }).join("");

    return `
      <div class="item">
        <div style="min-width:0;">
          <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
            <b style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width: 520px;">${esc(l.person_name)}</b>
            ${loanStatusBadge(l)}
            <span class="badge">ID: ${l.id}</span>
          </div>
          <div class="meta">
            Por: ${esc(l.user_username)} •
            Empréstimo: ${esc(l.loan_date || "—")} •
            Prazo: ${esc(l.due_date || "—")} •
            Retorno: ${esc(l.return_date || "—")}
          </div>
          ${l.notes ? `<div class="meta">Obs: ${esc(l.notes)}</div>` : ""}
          <div style="margin-top:10px; display:flex; flex-direction:column; gap:8px;">
            ${itemsHtml}
          </div>
        </div>
        <div class="item-actions">
          ${l.status === "LOANED" ? `<button class="btn" data-renew="${l.id}">Renovar</button>` : ""}
          ${l.status === "LOANED" ? `<button class="btn warn" data-returnall="${l.id}">Devolver tudo</button>` : ""}
        </div>
      </div>
    `;
  }).join("") || `<div class="muted small">Nenhum empréstimo encontrado.</div>`;
}

$("#qLoans")?.addEventListener("input", renderLoans);
$("#btnReloadLoans")?.addEventListener("click", async () => {
  await loadLoans();
  renderLoans();
  renderDashboard();
  toast("Empréstimos atualizados.");
});

function setOverdueMode(on) {
  OVERDUE_ONLY = on;
  toast(on ? "Mostrando apenas atrasados." : "Mostrando todos.");
  renderLoans();
}

$("#btnOverdue")?.addEventListener("click", () => setOverdueMode(!OVERDUE_ONLY));
$("#btnOverdueDash")?.addEventListener("click", () => { navigate("loans"); setOverdueMode(true); });
$("#btnOverdueTop")?.addEventListener("click", () => { navigate("loans"); setOverdueMode(true); });

/* ========= Loan Modal ========= */
const loanModal = $("#loanModal");
const renewModal = $("#renewModal");
const returnItemModal = $("#returnItemModal");

$("#btnOpenLoanModal")?.addEventListener("click", () => openLoanModal());
$("#btnOpenLoanModal2")?.addEventListener("click", () => openLoanModal());

async function openLoanModal() {
  if (!loanModal) return;
  $("#personSearch").value = "";
  $("#personIdHidden").value = "";
  $("#loanDue").value = "";
  $("#loanNotes").value = "";
  $("#loanItems").innerHTML = "";
  // garante listas atualizadas para autocomplete
  try {
    await loadPeople("");
    await loadBooks("");
  } catch (e) {
    // ignore
  }
  addLoanItemRow();
  loanModal.showModal();
}

function addLoanItemRow() {
  const wrap = $("#loanItems");
  if (!wrap) return;

  const id = `li_${Math.random().toString(16).slice(2)}`;
  const row = document.createElement("div");
  row.className = "item";
  row.style.padding = "10px";
  row.innerHTML = `
    <div style="flex:1; min-width:0;">
      <label style="margin:0;">Livro
        <input data-booksearch placeholder="Digite título..." autocomplete="off" />
        <input type="hidden" data-bookid />
        <div class="acbox" data-acbooks></div>
      </label>
      <div class="meta" data-bookmeta>—</div>
    </div>
    <div style="width:140px;">
      <label style="margin:0;">Qtd
        <input data-qty type="number" min="1" value="1" />
      </label>
    </div>
    <div class="item-actions" style="align-self:flex-end;">
      <button class="btn danger" type="button" data-removeitem>Remover</button>
    </div>
  `;
  wrap.appendChild(row);

  const inp = row.querySelector("[data-booksearch]");
  const hid = row.querySelector("[data-bookid]");
  const ac = row.querySelector("[data-acbooks]");
  const meta = row.querySelector("[data-bookmeta]");

  function closeAc() { ac.classList.remove("show"); ac.innerHTML = ""; }
  function openAc() { ac.classList.add("show"); }

  inp.addEventListener("input", () => {
    const q = inp.value.trim().toLowerCase();
    if (!q) { closeAc(); return; }
    const found = BOOKS
      .filter(b => (b.title||"").toLowerCase().includes(q))
      .slice(0, 6);
    if (!found.length) { closeAc(); return; }
    openAc();
    ac.innerHTML = found.map(b => `
      <div class="acitem" data-pick="${b.id}">
        <div class="acmain">${esc(b.title)}</div>
        <div class="acsub">Disponível: ${b.available_qty} • Prateleira: ${esc(b.shelf || "—")}</div>
      </div>
    `).join("");
  });

  ac.addEventListener("click", (e) => {
    const pick = e.target.closest("[data-pick]");
    if (!pick) return;
    const b = BOOKS.find(x => String(x.id) === String(pick.dataset.pick));
    if (!b) return;
    hid.value = b.id;
    inp.value = b.title;
    meta.textContent = `Autor: ${b.author || "—"} • Disponível: ${b.available_qty} • Prateleira: ${b.shelf || "—"}`;
    closeAc();
  });

  document.addEventListener("click", (e) => {
    if (!row.contains(e.target)) closeAc();
  });

  row.querySelector("[data-removeitem]").addEventListener("click", () => row.remove());
}

$("#btnAddItem")?.addEventListener("click", addLoanItemRow);

/* People autocomplete (loan modal) */
const acPeople = $("#acPeople");
function closePeopleAc() { acPeople?.classList.remove("show"); if (acPeople) acPeople.innerHTML = ""; }
function openPeopleAc() { acPeople?.classList.add("show"); }

$("#personSearch")?.addEventListener("input", () => {
  const q = $("#personSearch").value.trim().toLowerCase();
  if (!q) { closePeopleAc(); return; }
  const found = PEOPLE.filter(p => (p.name||"").toLowerCase().includes(q)).slice(0, 7);
  if (!found.length) { closePeopleAc(); return; }

  openPeopleAc();
  acPeople.innerHTML = found.map(p => `
    <div class="acitem" data-pick="${p.id}">
      <div class="acmain">${esc(p.name)}</div>
      <div class="acsub">${esc(p.phone || "—")} • ${esc(p.email || "—")}</div>
    </div>
  `).join("");
});

acPeople?.addEventListener("click", (e) => {
  const pick = e.target.closest("[data-pick]");
  if (!pick) return;
  const p = PEOPLE.find(x => String(x.id) === String(pick.dataset.pick));
  if (!p) return;
  $("#personIdHidden").value = p.id;
  $("#personSearch").value = p.name;
  closePeopleAc();
});

document.addEventListener("click", (e) => {
  if (!$("#personSearch")?.contains(e.target) && !acPeople?.contains(e.target)) closePeopleAc();
});

$("#btnSubmitLoan")?.addEventListener("click", async () => {
  const person_id = Number($("#personIdHidden").value || 0);
  const due_date = $("#loanDue").value.trim();
  const notes = $("#loanNotes").value.trim();

  const itemRows = Array.from($("#loanItems").children);
  const items = [];
  for (const r of itemRows) {
    const book_id = Number(r.querySelector("[data-bookid]")?.value || 0);
    const qty = Math.max(1, Number(r.querySelector("[data-qty]")?.value || 1));
    if (book_id) items.push({ book_id, qty });
  }

  if (!person_id) return toast("Selecione uma pessoa.");
  if (!items.length) return toast("Adicione pelo menos 1 livro.");

  try {
    await api("/api/loans", { method: "POST", body: JSON.stringify({ person_id, due_date: due_date || null, notes: notes || null, items }) });
    loanModal.close();
    toast("Empréstimo registrado!");
    await loadBooks();
    await loadLoans();
    renderBooks();
    renderLoans();
    renderDashboard();
  } catch (err) {
    toast(`Erro ao registrar empréstimo: ${err.message}`);
  }
});

/* Renew modal */
$("#loansList")?.addEventListener("click", async (e) => {
  const renew = e.target.closest("[data-renew]");
  const retAll = e.target.closest("[data-returnall]");
  const retItem = e.target.closest("[data-returnitem]");

  if (renew) {
    $("#renewLoanId").value = renew.dataset.renew;
    $("#renewDue").value = "";
    renewModal.showModal();
  }

  if (retAll) {
    const id = retAll.dataset.returnall;
    if (!confirm("Devolver todos os itens deste empréstimo?")) return;
    try {
      await api(`/api/loans/${id}/return`, { method: "POST" });
      toast("Devolução total registrada.");
      await loadBooks(); await loadLoans();
      renderBooks(); renderLoans(); renderDashboard();
    } catch (err) {
      toast(`Erro: ${err.message}`);
    }
  }

  if (retItem) {
    const loanId = retItem.dataset.loan;
    const itemId = retItem.dataset.returnitem;
    const max = Number(retItem.dataset.max || 1);
    $("#riLoanId").value = loanId;
    $("#riItemId").value = itemId;
    $("#riMax").value = String(max);
    $("#riQty").value = "1";
    $("#riQty").max = String(max);
    $("#returnItemHint").textContent = `Máximo: ${max}`;
    returnItemModal.showModal();
  }
});

$("#btnRenewConfirm")?.addEventListener("click", async () => {
  const id = $("#renewLoanId").value;
  const due_date = $("#renewDue").value.trim();
  if (!due_date) return toast("Informe a nova data.");
  try {
    await api(`/api/loans/${id}/renew`, { method: "POST", body: JSON.stringify({ due_date }) });
    renewModal.close();
    toast("Renovação salva.");
    await loadLoans();
    renderLoans();
    renderDashboard();
  } catch (err) {
    toast(`Erro: ${err.message}`);
  }
});

$("#btnReturnItemConfirm")?.addEventListener("click", async () => {
  const loanId = $("#riLoanId").value;
  const itemId = $("#riItemId").value;
  const max = Number($("#riMax").value || 1);
  const qty = Math.max(1, Math.min(max, Number($("#riQty").value || 1)));
  try {
    await api(`/api/loans/${loanId}/return-item`, { method: "POST", body: JSON.stringify({ loan_item_id: Number(itemId), qty }) });
    returnItemModal.close();
    toast("Item devolvido.");
    await loadBooks(); await loadLoans();
    renderBooks(); renderLoans(); renderDashboard();
  } catch (err) {
    toast(`Erro: ${err.message}`);
  }
});

/* ========= Settings ========= */
$("#pwdForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const current_password = String(fd.get("current_password") || "");
  const new_password = String(fd.get("new_password") || "");
  try {
    await api("/api/user/change-password", { method: "POST", body: JSON.stringify({ current_password, new_password }) });
    e.target.reset();
    toast("Senha atualizada.");
  } catch (err) {
    toast(`Erro: ${err.message}`);
  }
});

$("#btnBackupNow")?.addEventListener("click", async () => {
  try {
    const r = await api("/api/backup/now", { method: "POST" });
    toast(`Backup criado: ${r.file}`);
    await renderBackups();
  } catch (err) {
    toast(`Erro: ${err.message}`);
  }
});

$("#btnRestore")?.addEventListener("click", async () => {
  const f = $("#restoreFile")?.files?.[0];
  if (!f) return toast("Escolha um arquivo .sqlite");
  if (!confirm("Tem certeza? O backup será enviado e salvo como database.sqlite.restored")) return;
  try {
    const fd = new FormData();
    fd.append("file", f);
    const r = await apiForm("/api/backup/restore", fd);
    toast("Restore enviado.");
    alert(r.message);
  } catch (err) {
    toast(`Erro: ${err.message}`);
  }
});

async function renderBackups() {
  const list = $("#backupList");
  if (!list) return;
  list.innerHTML = `<div class="muted small">Carregando...</div>`;
  try {
    const rows = await api("/api/backups");
    list.innerHTML = rows.map(b => `
      <a class="btn w100" href="${API_BASE}/api/backups/download/${encodeURIComponent(b.file)}" target="_blank">⬇️ ${esc(b.file)}</a>
    `).join("") || `<div class="muted small">Sem backups.</div>`;
  } catch (err) {
    list.innerHTML = `<div class="muted small">Somente admin.</div>`;
  }
}

/* ========= Users (admin) ========= */
async function renderUsers() {
  const list = $("#usersList");
  if (!list) return;
  list.innerHTML = `<div class="muted small">Carregando...</div>`;
  try {
    const rows = await api("/api/users");
    list.innerHTML = rows.map(u => `
      <div class="item">
        <div>
          <b>#${u.id} — ${esc(u.username)}</b>
          <div class="meta">role: ${esc(u.role)} • ${esc(u.created_at || "—")}</div>
        </div>
        <div class="item-actions">
          <button class="btn" data-role="${u.id}" data-v="staff">staff</button>
          <button class="btn" data-role="${u.id}" data-v="admin">admin</button>
          <button class="btn warn" data-reset="${u.id}">Reset senha</button>
          <button class="btn danger" data-deluser="${u.id}">Remover</button>
        </div>
      </div>
    `).join("") || `<div class="muted small">Sem usuários.</div>`;
  } catch (err) {
    list.innerHTML = `<div class="muted small">Somente admin.</div>`;
  }
}

$("#btnReloadUsers")?.addEventListener("click", renderUsers);

$("#userCreateForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const body = {
    username: String(fd.get("username") || "").trim(),
    password: String(fd.get("password") || ""),
    role: String(fd.get("role") || "staff"),
  };
  try {
    await api("/api/users", { method: "POST", body: JSON.stringify(body) });
    e.target.reset();
    toast("Usuário criado.");
    renderUsers();
  } catch (err) {
    toast(`Erro: ${err.message}`);
  }
});

$("#usersList")?.addEventListener("click", async (e) => {
  const roleBtn = e.target.closest("[data-role]");
  const resetBtn = e.target.closest("[data-reset]");
  const delBtn = e.target.closest("[data-deluser]");

  try {
    if (roleBtn) {
      const id = roleBtn.dataset.role;
      const role = roleBtn.dataset.v;
      await api(`/api/users/${id}/set-role`, { method: "POST", body: JSON.stringify({ role }) });
      toast("Role atualizado.");
      return renderUsers();
    }

    if (resetBtn) {
      const id = resetBtn.dataset.reset;
      const np = prompt("Nova senha (mín 6):");
      if (!np) return;
      await api(`/api/users/${id}/reset-password`, { method: "POST", body: JSON.stringify({ new_password: np }) });
      toast("Senha resetada.");
      return renderUsers();
    }

    if (delBtn) {
      const id = delBtn.dataset.deluser;
      if (!confirm("Remover usuário? (Não pode ter histórico de empréstimo)")) return;
      await api(`/api/users/${id}`, { method: "DELETE" });
      toast("Usuário removido.");
      return renderUsers();
    }
  } catch (err) {
    toast(`Erro: ${err.message}`);
  }
});

/* ========= Logs ========= */
async function renderLogs() {
  const list = $("#logsList");
  if (!list) return;
  list.innerHTML = `<div class="muted small">Carregando...</div>`;
  try {
    const rows = await api("/api/logs");
    list.innerHTML = rows.map(r => `
      <div class="item">
        <div>
          <b>${esc(r.action)} • ${esc(r.entity)}</b>
          <div class="meta">${esc(r.created_at)} • usuário: ${esc(r.user_username || "—")} (${esc(r.user_role || "—")})</div>
          ${r.details ? `<div class="meta">detalhes: ${esc(r.details)}</div>` : ""}
        </div>
        <div class="item-actions">
          <span class="badge">#${r.id}</span>
          ${r.entity_id ? `<span class="badge">entity_id: ${r.entity_id}</span>` : ""}
        </div>
      </div>
    `).join("") || `<div class="muted small">Sem logs.</div>`;
  } catch (err) {
    list.innerHTML = `<div class="muted small">Erro: ${esc(err.message)}</div>`;
  }
}
$("#btnReloadLogs")?.addEventListener("click", renderLogs);

/* ========= Loaders ========= */
async function loadBooks(q = "") {
  const qs = q ? `?q=${encodeURIComponent(q)}` : "";
  BOOKS = await api(`/api/books${qs}`);
}
async function loadPeople(q = "") {
  const qs = q ? `?q=${encodeURIComponent(q)}` : "";
  PEOPLE = await api(`/api/people${qs}`);
}
async function loadLoans() {
  LOANS = await api("/api/loans");
}

async function reloadAll() {
  await Promise.all([loadBooks(), loadPeople(), loadLoans()]);
  renderDashboard();
}

/* ========= Boot ========= */
async function boot() {
  try {
    await refreshMe();
  } catch {
    ME = null;
  }

  if (!ME) {
    showOnly("login");
    $("#btnLogout").style.display = "none";
    $("#userChip").style.display = "none";
    return;
  }

  $("#btnLogout").style.display = "";
  $("#userChip").style.display = "";

  showOnly("dashboard");
  setActiveNav("dashboard");
  await reloadAll();
  renderBooks();
  renderPeople();
  renderLoans();
  renderBackups();
  renderUsers();
  renderLogs();
}

boot();
