// ========= API helper (mesma origem: http://localhost:3000) =========
async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    credentials: "same-origin",
    ...options,
  });

  if (res.status === 401) throw new Error("NOT_AUTHENTICATED");

  if (!res.ok) {
    let msg = "Erro na API";
    try {
      const j = await res.json();
      msg = j?.error || msg;
    } catch {}
    throw new Error(msg);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));


// ===== Modal helper (sem libs) =====
const Modal = (() => {
  const errElId = "modalError";

  const backdrop = () => document.getElementById("appModal");
  const titleEl = () => document.getElementById("modalTitle");
  const subEl = () => document.getElementById("modalSubtitle");
  const bodyEl = () => document.getElementById("modalBody");

  function open({ title, subtitle, contentHTML, confirmText = "Salvar", cancelText = "Cancelar", onConfirm }) {
    titleEl().textContent = title || "Modal";
    subEl().textContent = subtitle || "";
    bodyEl().innerHTML = contentHTML + `<div id="${errElId}" class="form-error"></div>`;

    document.getElementById("modalConfirm").textContent = confirmText;
    document.getElementById("modalCancel").textContent = cancelText;

    const bd = backdrop();
    bd.classList.add("open");
    bd.setAttribute("aria-hidden", "false");

    setTimeout(() => {
      const first = bodyEl().querySelector("input, select, textarea, button");
      if (first) first.focus();
    }, 0);

    return new Promise((resolve) => {
      const setError = (msg) => {
        const e = document.getElementById(errElId);
        if (e) e.textContent = msg || "";
      };

      const close = (result) => {
        bd.classList.remove("open");
        bd.setAttribute("aria-hidden", "true");
        bd.onclick = null;
        window.onkeydown = null;
        resolve(result);
      };

      const cancel = () => close(false);

      const confirm = async () => {
        try {
          setError("");
          const result = await onConfirm?.({ close, setError });
          close(result ?? true);
        } catch (e) {
          setError(e?.message || "Erro ao salvar.");
        }
      };

      document.getElementById("modalClose").onclick = cancel;
      document.getElementById("modalCancel").onclick = cancel;
      document.getElementById("modalConfirm").onclick = confirm;

      bd.onclick = (ev) => {
        if (ev.target === bd) cancel();
      };

      window.onkeydown = (ev) => {
        if (ev.key === "Escape") cancel();
      };
    });
  }

  return { open };
})();


function formatDate(dateString) {
  if (!dateString) return "-";
  const d = new Date(String(dateString).replace(" ", "T"));
  return isNaN(d.getTime()) ? "-" : d.toLocaleDateString("pt-BR");
}

function showLogin(show) {
  const overlay = $("#loginOverlay");
  if (!overlay) return;
  overlay.style.display = show ? "flex" : "none";
}

function setUserUI(user) {
  const el = $("#userName");
  if (!el) return;
  el.textContent = user ? `Bem-vindo, ${user.username}!` : "Bem-vindo!";
}

function setActiveNav(route) {
  $$(".sidebar-nav .nav-item").forEach((a) => a.classList.remove("active"));
  const link = $(`.sidebar-nav .nav-item[data-route="${route}"]`);
  if (link) link.classList.add("active");
}

function showView(route) {
  $$(".view").forEach((v) => v.classList.remove("active"));
  const view = $(`#view-${route}`);
  if (view) view.classList.add("active");
  setActiveNav(route);
}

// ========= Dashboard =========
function sumLoanedBooks(activeLoans) {
  let total = 0;
  for (const loan of activeLoans || []) {
    for (const it of loan.items || []) {
      total += Math.max(0, (Number(it.qty) || 0) - (Number(it.returned_qty) || 0));
    }
  }
  return total;
}

function buildMonthly(loans) {
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.push({ key, month: d.toLocaleString("pt-BR", { month: "short" }), loaned: 0, returned: 0 });
  }
  const map = new Map(months.map((m) => [m.key, m]));
  for (const l of loans || []) {
    const loanKey = String(l.loan_date || "").slice(0, 7);
    if (map.has(loanKey)) map.get(loanKey).loaned += 1;

    if (l.return_date) {
      const retKey = String(l.return_date).slice(0, 7);
      if (map.has(retKey)) map.get(retKey).returned += 1;
    }
  }
  return months.map((m) => ({ month: m.month.toUpperCase(), loaned: m.loaned, returned: m.returned }));
}

function renderChart(monthlyLoans) {
  const container = $("#chartContainer");
  if (!container) return;

  if (!monthlyLoans || monthlyLoans.length === 0) {
    container.innerHTML = '<p class="loading">Sem dados disponíveis</p>';
    return;
  }

  const maxValue = Math.max(...monthlyLoans.flatMap((m) => [m.loaned, m.returned]), 1);
  const scale = 180 / maxValue;

  container.innerHTML = monthlyLoans
    .map(
      (m) => `
    <div class="chart-month">
      <div class="chart-bars">
        <div class="bar loaned" style="height:${m.loaned * scale}px" title="Emprestados: ${m.loaned}"></div>
        <div class="bar returned" style="height:${m.returned * scale}px" title="Devolvidos: ${m.returned}"></div>
      </div>
      <span class="month-label">${m.month}</span>
    </div>
  `
    )
    .join("");
}

async function loadDashboard() {
  const [books, people, loansAll, loansActive, loansOverdue] = await Promise.all([
    api("/api/books"),
    api("/api/people"),
    api("/api/loans"),
    api("/api/loans?status=LOANED"),
    api("/api/loans?overdue=1"),
  ]);

  const totalBooks = (books || []).reduce((s, b) => s + (Number(b.total_qty) || 0), 0);
  const totalReaders = (people || []).length;
  const booksLoaned = sumLoanedBooks(loansActive || []);
  const booksOverdue = sumLoanedBooks(loansOverdue || []);

  $("#totalBooks").textContent = totalBooks;
  $("#totalReaders").textContent = totalReaders;
  $("#booksLoaned").textContent = booksLoaned;
  $("#booksOverdue").textContent = booksOverdue;

  const tbodyLoans = $("#loansTableBody");
  const recentLoans = (loansAll || []).slice(0, 4);
  tbodyLoans.innerHTML = recentLoans.length
    ? recentLoans
        .map((l) => {
          const firstTitle = l.items?.[0]?.title ? l.items[0].title : "-";
          return `<tr><td>${l.person_name || "-"}</td><td>${firstTitle}</td><td>${formatDate(l.loan_date)}</td></tr>`;
        })
        .join("")
    : '<tr><td colspan="3" class="loading">Nenhum empréstimo encontrado</td></tr>';

  const tbodyReaders = $("#readersTableBody");
  const recentPeople = (people || []).slice(0, 4);
  tbodyReaders.innerHTML = recentPeople.length
    ? recentPeople
        .map((p) => `<tr><td class="reader-name">${p.name || "-"}</td><td>${p.email || "-"}</td></tr>`)
        .join("")
    : '<tr><td colspan="2" class="loading">Nenhum leitor encontrado</td></tr>';

  renderChart(buildMonthly(loansAll || []));
}

// ========= Books =========
function renderBooksTable(books) {
  const tbody = $("#booksTableBody");
  if (!tbody) return;

  if (!books?.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="loading">Nenhum livro encontrado</td></tr>';
    return;
  }

  tbody.innerHTML = books
    .map(
      (b) => `
    <tr>
      <td>${b.title || "-"}</td>
      <td>${b.author || "-"}</td>
      <td>${b.category || "-"}</td>
      <td>${Number(b.available_qty ?? 0)}</td>
      <td>${Number(b.total_qty ?? 0)}</td>
      <td>
        <button class="btn-outline js-adjust" data-id="${b.id}" data-delta="1">+1</button>
        <button class="btn-outline js-adjust" data-id="${b.id}" data-delta="-1">-1</button>
        <button class="btn-outline js-delete-book" data-id="${b.id}">Excluir</button>
      </td>
    </tr>
  `
    )
    .join("");
}

async function loadBooks() {
  const q = $("#booksSearch")?.value?.trim() || "";
  const books = await api(`/api/books${q ? `?q=${encodeURIComponent(q)}` : ""}`);
  renderBooksTable(books);
}

async function addBook() {
  await Modal.open({
    title: "Adicionar livro",
    subtitle: "Preencha os dados abaixo.",
    confirmText: "Cadastrar",
    contentHTML: `
      <div class="form-grid">
        <div class="form-row">
          <label>Título *</label>
          <input id="mTitle" placeholder="Ex: Peter Pan" />
        </div>
        <div class="form-row">
          <label>Autor</label>
          <input id="mAuthor" placeholder="Ex: J.M. Barrie" />
        </div>
        <div class="form-row">
          <label>Categoria</label>
          <input id="mCategory" placeholder="Ex: Aventura" />
        </div>
        <div class="form-row">
          <label>Quantidade total *</label>
          <input id="mQty" type="number" min="1" value="1" />
        </div>
      </div>
    `,
    onConfirm: async ({ setError }) => {
      const title = document.getElementById("mTitle").value.trim();
      const author = document.getElementById("mAuthor").value.trim();
      const category = document.getElementById("mCategory").value.trim();
      const total_qty = Number(document.getElementById("mQty").value);

      if (!title) return setError("Título é obrigatório.");
      if (!total_qty || total_qty < 1) return setError("Quantidade precisa ser no mínimo 1.");

      await api("/api/books", {
        method: "POST",
        body: JSON.stringify({ title, author, category, total_qty }),
      });

      await loadBooks();
      await loadDashboard();
    },
  });
}

async function adjustBook(id, delta) {
  await api(`/api/books/${id}/adjust`, {
    method: "POST",
    body: JSON.stringify({ delta }),
  });
  await loadBooks();
}

async function deleteBook(id) {
  if (!confirm("Tem certeza que deseja excluir este livro?")) return;
  await api(`/api/books/${id}`, { method: "DELETE" });
  await loadBooks();
}

// ========= Readers =========
function renderReadersTable(people) {
  const tbody = $("#readersFullTableBody");
  if (!tbody) return;

  if (!people?.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="loading">Nenhum leitor encontrado</td></tr>';
    return;
  }

  tbody.innerHTML = people
    .map((p) => {
      const safeName = String(p.name || "").replace(/"/g, "&quot;");
      return `
        <tr>
          <td>${p.name || "-"}</td>
          <td>${p.email || "-"}</td>
          <td>${p.phone || "-"}</td>
          <td>
            <button class="btn-outline js-delete-reader" data-id="${p.id}" data-name="${safeName}">Excluir</button>
          </td>
        </tr>
      `;
    })
    .join("");
}

async function loadReaders() {
  const q = $("#readersSearch")?.value?.trim() || "";
  const people = await api(`/api/people${q ? `?q=${encodeURIComponent(q)}` : ""}`);
  renderReadersTable(people);
}

async function addReader() {
  await Modal.open({
    title: "Adicionar leitor",
    subtitle: "Cadastre um novo leitor.",
    confirmText: "Cadastrar",
    contentHTML: `
      <div class="form-grid">
        <div class="form-row">
          <label>Nome *</label>
          <input id="mName" placeholder="Ex: Simone Melo" />
        </div>
        <div class="form-row">
          <label>Email</label>
          <input id="mEmail" type="email" placeholder="ex@email.com" />
        </div>
        <div class="form-row">
          <label>Telefone</label>
          <input id="mPhone" placeholder="(opcional)" />
        </div>
      </div>
    `,
    onConfirm: async ({ setError }) => {
      const name = document.getElementById("mName").value.trim();
      const email = document.getElementById("mEmail").value.trim();
      const phone = document.getElementById("mPhone").value.trim();

      if (!name) return setError("Nome é obrigatório.");

      await api("/api/people", {
        method: "POST",
        body: JSON.stringify({ name, email, phone }),
      });

      await loadReaders();
      await loadDashboard();
    },
  });
}


async function deleteReader(id, name) {
  if (!confirm(`Excluir leitor "${name || ""}"? (O histórico de empréstimos será mantido)`)) return;
  await api(`/api/people/${id}`, { method: "DELETE" });
  await loadReaders();
  await loadDashboard();
}

// ========= Loans =========
function renderLoansTable(loans) {
  const tbody = $("#loansFullTableBody");
  if (!tbody) return;

  if (!loans?.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="loading">Nenhum empréstimo encontrado</td></tr>';
    return;
  }

  tbody.innerHTML = loans
    .map((l) => {
      const items = (l.items || [])
        .map((it) => `${it.title} x${it.qty}${it.returned_qty ? ` (dev: ${it.returned_qty})` : ""}`)
        .join("<br/>");

      const canReturn = l.status === "LOANED";
      const actionBtn = canReturn
        ? `<button class="btn-outline js-return-loan" data-id="${l.id}">Devolver</button>`
        : `<span class="badge success">OK</span>`;

      return `
      <tr>
        <td>${l.person_name || "-"}</td>
        <td>${l.status || "-"}</td>
        <td>${formatDate(l.loan_date)}</td>
        <td>${formatDate(l.due_date)}</td>
        <td>${items || "-"}</td>
        <td>${actionBtn}</td>
      </tr>
    `;
    })
    .join("");
}

async function loadLoans() {
  const q = $("#loansSearch")?.value?.trim() || "";
  const status = $("#loansFilter")?.value || "";
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (status) params.set("status", status);

  const url = `/api/loans${params.toString() ? `?${params.toString()}` : ""}`;
  const loans = await api(url);
  renderLoansTable(loans);
}

async function addLoan() {
  const [people, books] = await Promise.all([api("/api/people"), api("/api/books")]);

  if (!people?.length) return alert("Cadastre um leitor primeiro.");
  if (!books?.length) return alert("Cadastre um livro primeiro.");

  // Datalist (pesquisável)
  const peopleOptions = people
    .map((p) => `<option value="${p.name} (id:${p.id})"></option>`)
    .join("");

  const bookOptions = books
    .map((b) => `<option value="${b.title} (id:${b.id}) — disp:${b.available_qty}"></option>`)
    .join("");

  await Modal.open({
    title: "Novo empréstimo",
    subtitle: "Pesquise e selecione leitor e livro.",
    confirmText: "Registrar",
    contentHTML: `
      <div class="form-grid">
        <div class="form-row">
          <label>Leitor *</label>
          <div class="input-wrap">
            <span class="input-icon">🔎</span>
            <input id="mPersonSearch" class="input-search" list="peopleDatalist" placeholder="Digite para buscar (ex: Simone)..." />
          </div>
          <datalist id="peopleDatalist">${peopleOptions}</datalist>
          <small class="hint">Selecione um item da lista (tem que aparecer “(id:...)”).</small>
        </div>

        <div class="form-row">
          <label>Livro *</label>
          <div class="input-wrap">
            <span class="input-icon">🔎</span>
            <input id="mBookSearch" class="input-search" list="booksDatalist" placeholder="Digite para buscar (ex: Peter Pan)..." />
          </div>
          <datalist id="booksDatalist">${bookOptions}</datalist>
          <small class="hint">Selecione um item da lista (tem que aparecer “(id:...)”).</small>
        </div>

        <div class="form-row">
          <label>Quantidade *</label>
          <input id="mLoanQty" type="number" min="1" value="1" />
        </div>

        <div class="form-row">
          <label>Vencimento (opcional)</label>
          <input id="mDue" type="date" />
        </div>
      </div>
    `,
    onConfirm: async ({ setError }) => {
      const personRaw = document.getElementById("mPersonSearch").value.trim();
      const bookRaw = document.getElementById("mBookSearch").value.trim();
      const qty = Number(document.getElementById("mLoanQty").value);
      const due_date = document.getElementById("mDue").value || null;

      const personMatch = personRaw.match(/\(id:(\d+)\)/i);
      const bookMatch = bookRaw.match(/\(id:(\d+)\)/i);

      const person_id = personMatch ? Number(personMatch[1]) : 0;
      const book_id = bookMatch ? Number(bookMatch[1]) : 0;

      if (!person_id) return setError("Selecione um leitor na lista (precisa conter “(id:...)”).");
      if (!book_id) return setError("Selecione um livro na lista (precisa conter “(id:...)”).");
      if (!qty || qty < 1) return setError("Quantidade precisa ser no mínimo 1.");

      await api("/api/loans", {
        method: "POST",
        body: JSON.stringify({
          person_id,
          due_date,
          items: [{ book_id, qty }],
        }),
      });

      // Atualiza telas (inclui livros para refletir estoque)
      await loadLoans();
      await loadBooks();
      await loadDashboard();
    },
  });
}


async function returnLoan(loanId) {
  if (!confirm("Confirmar devolução de TODOS os itens deste empréstimo?")) return;
  await api(`/api/loans/${loanId}/return`, { method: "POST" });
  await loadLoans();
  await loadDashboard();
}


// ========= Admin (Token Protected) =========
function getAdminToken() {
  return sessionStorage.getItem("adminToken") || "";
}

function setAdminToken(token) {
  if (token) sessionStorage.setItem("adminToken", token);
  else sessionStorage.removeItem("adminToken");
}

async function adminApi(path, options = {}) {
  const token = getAdminToken();
  return api(path, {
    ...options,
    headers: { ...(options.headers || {}), "x-admin-token": token },
  });
}

async function promptAdminToken() {
  await Modal.open({
    title: "Token de Admin",
    subtitle: "Apenas quem tem o token consegue gerenciar usuários.",
    confirmText: "Salvar",
    contentHTML: `
      <div class="form-grid">
        <div class="form-row">
          <label>Token *</label>
          <div class="input-wrap">
            <span class="input-icon">🔑</span>
            <input id="mAdminToken" class="input-search" placeholder="Cole o token aqui..." value="${getAdminToken().replace(/"/g,'&quot;')}" />
          </div>
          <small class="hint">Defina no backend com ADMIN_TOKEN no .env.</small>
        </div>
      </div>
    `,
    onConfirm: async ({ setError }) => {
      const token = document.getElementById("mAdminToken").value.trim();
      if (!token) return setError("Token é obrigatório.");
      setAdminToken(token);

      try {
        await adminApi("/api/admin/ping");
      } catch {
        setAdminToken("");
        return setError("Token inválido.");
      }
      await loadAdminUsers();
    },
  });
}

function renderAdminUsers(users) {
  const tbody = document.getElementById("adminUsersBody");
  const status = document.getElementById("adminStatus");
  if (!tbody || !status) return;

  if (!getAdminToken()) {
    status.textContent = "Informe o token para acessar.";
    tbody.innerHTML = "";
    return;
  }

  status.textContent = "Acesso liberado. Você pode criar/editar usuários.";
  if (!users?.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="loading">Nenhum usuário encontrado</td></tr>';
    return;
  }

  tbody.innerHTML = users.map(u => `
    <tr>
      <td>${u.id}</td>
      <td>${u.username}</td>
      <td>${u.role}</td>
      <td>${formatDate(u.created_at)}</td>
      <td>
        <button class="btn-outline js-admin-edit" data-id="${u.id}" data-username="${String(u.username).replace(/"/g,'&quot;')}" data-role="${u.role}">Editar</button>
        <button class="btn-outline js-admin-del" data-id="${u.id}" data-username="${String(u.username).replace(/"/g,'&quot;')}">Excluir</button>
      </td>
    </tr>
  `).join("");
}

async function loadAdminUsers() {
  const status = document.getElementById("adminStatus");
  if (status && !getAdminToken()) {
    status.textContent = "Informe o token para acessar.";
    renderAdminUsers([]);
    return;
  }

  try {
    const users = await adminApi("/api/admin/users");
    renderAdminUsers(users);
  } catch {
    if (status) status.textContent = "Token inválido ou erro ao carregar usuários.";
    renderAdminUsers([]);
  }
}

async function adminNewUser() {
  await Modal.open({
    title: "Criar usuário",
    subtitle: "Crie um novo login para o sistema.",
    confirmText: "Criar",
    contentHTML: `
      <div class="form-grid">
        <div class="form-row">
          <label>Usuário *</label>
          <input id="mNewUsername" placeholder="ex: joao" />
        </div>
        <div class="form-row">
          <label>Senha *</label>
          <input id="mNewPassword" type="password" placeholder="mín. 4 caracteres" />
        </div>
        <div class="form-row">
          <label>Role</label>
          <select id="mNewRole">
            <option value="admin">admin</option>
            <option value="staff">staff</option>
          </select>
        </div>
      </div>
    `,
    onConfirm: async ({ setError }) => {
      const username = document.getElementById("mNewUsername").value.trim();
      const password = document.getElementById("mNewPassword").value;
      const role = document.getElementById("mNewRole").value;

      if (!username) return setError("Usuário é obrigatório.");
      if (!password || password.length < 4) return setError("Senha precisa ter no mínimo 4 caracteres.");

      await adminApi("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({ username, password, role }),
      });

      await loadAdminUsers();
    },
  });
}

async function adminEditUser(id, username, role) {
  await Modal.open({
    title: "Editar usuário",
    subtitle: "Você pode trocar nome, role e/ou redefinir senha.",
    confirmText: "Salvar",
    contentHTML: `
      <div class="form-grid">
        <div class="form-row">
          <label>Usuário</label>
          <input id="mEditUsername" value="${String(username).replace(/"/g,'&quot;')}" />
        </div>
        <div class="form-row">
          <label>Role</label>
          <select id="mEditRole">
            <option value="admin" ${role === "admin" ? "selected" : ""}>admin</option>
            <option value="staff" ${role === "staff" ? "selected" : ""}>staff</option>
          </select>
        </div>
        <div class="form-row">
          <label>Nova senha (opcional)</label>
          <input id="mEditPassword" type="password" placeholder="deixe vazio para não mudar" />
        </div>
      </div>
    `,
    onConfirm: async ({ setError }) => {
      const newUsername = document.getElementById("mEditUsername").value.trim();
      const newRole = document.getElementById("mEditRole").value;
      const newPass = document.getElementById("mEditPassword").value;

      if (!newUsername) return setError("Usuário não pode ficar vazio.");

      await adminApi(`/api/admin/users/${id}`, {
        method: "PUT",
        body: JSON.stringify({ username: newUsername, role: newRole, password: newPass || undefined }),
      });

      await loadAdminUsers();
    },
  });
}

async function adminDeleteUser(id, username) {
  if (!confirm(`Excluir o usuário "${username}"?`)) return;
  await adminApi(`/api/admin/users/${id}`, { method: "DELETE" });
  await loadAdminUsers();
}

// ========= Auth =========
async function doLogin(username, password) {
  await api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

async function doLogout() {
  try {
    await api("/api/auth/logout", { method: "POST" });
  } finally {
    location.reload();
  }
}

async function checkAuth() {
  const me = await api("/api/me");
  if (!me?.user) throw new Error("NOT_AUTHENTICATED");
  setUserUI(me.user);
}

// ========= Router =========
async function onRouteChange() {
  const route = (location.hash || "#/dashboard").replace("#/", "");
  const safe = ["dashboard", "books", "readers", "loans", "admin"].includes(route) ? route : "dashboard";
  showView(safe);

  // Carrega dados da view ativa
  if (safe === "dashboard") await loadDashboard();
  if (safe === "books") await loadBooks();
  if (safe === "readers") await loadReaders();
  if (safe === "loans") await loadLoans();
  if (safe === "admin") await loadAdminUsers();
}

document.addEventListener("DOMContentLoaded", async () => {
  // Login form
  $("#loginForm")?.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    $("#loginError").textContent = "";
    const username = $("#loginUser")?.value?.trim();
    const password = $("#loginPass")?.value;

    try {
      await doLogin(username, password);
      showLogin(false);
      await checkAuth();
      await onRouteChange();
    } catch {
      $("#loginError").textContent = "Usuário ou senha inválidos (ou erro no servidor).";
    }
  });

  // Logout buttons
  $$(".btn-outline, .logout-btn").forEach((btn) => btn.addEventListener("click", doLogout));

  // Nav clicks
  $$(".sidebar-nav .nav-item").forEach((a) =>
    a.addEventListener("click", (ev) => {
      // deixa o hash mudar normalmente
      ev.preventDefault();
      const route = a.getAttribute("data-route");
      location.hash = `#/${route}`;
    })
  );

  
  // Dashboard quick links
  document.getElementById("btnGoLoans")?.addEventListener("click", () => {
    location.hash = "#/loans";
  });
  document.getElementById("btnGoReaders")?.addEventListener("click", () => {
    location.hash = "#/readers";
  });

  // Admin actions
  document.getElementById("btnAdminToken")?.addEventListener("click", () => promptAdminToken().catch((e) => alert(e.message)));
  document.getElementById("btnAdminRefresh")?.addEventListener("click", () => loadAdminUsers().catch(() => {}));
  document.getElementById("btnAdminNewUser")?.addEventListener("click", () => adminNewUser().catch((e) => alert(e.message)));

// Page actions
  $("#booksSearch")?.addEventListener("input", () => loadBooks().catch(() => {}));
  $("#btnAddBook")?.addEventListener("click", () => addBook().catch((e) => alert(e.message)));

  $("#readersSearch")?.addEventListener("input", () => loadReaders().catch(() => {}));
  $("#btnAddReader")?.addEventListener("click", () => addReader().catch((e) => alert(e.message)));

  $("#loansSearch")?.addEventListener("input", () => loadLoans().catch(() => {}));
  $("#loansFilter")?.addEventListener("change", () => loadLoans().catch(() => {}));
  $("#btnAddLoan")?.addEventListener("click", () => addLoan().catch((e) => alert(e.message)));

  // Delegation for books actions
  document.addEventListener("click", (ev) => {
    const t = ev.target;

    // Livros
    if (t?.classList?.contains("js-adjust")) {
      const id = t.getAttribute("data-id");
      const delta = Number(t.getAttribute("data-delta") || "0");
      adjustBook(id, delta).catch((e) => alert(e.message));
    }

    if (t?.classList?.contains("js-delete-book")) {
      const id = t.getAttribute("data-id");
      deleteBook(id).catch((e) => alert(e.message));
    }

    // Leitores
    if (t?.classList?.contains("js-delete-reader")) {
      const id = t.getAttribute("data-id");
      const name = t.getAttribute("data-name") || "";
      deleteReader(id, name).catch((e) => alert(e.message));
    }

    // Empréstimos
    if (t?.classList?.contains("js-return-loan")) {
      const id = t.getAttribute("data-id");
      returnLoan(id).catch((e) => alert(e.message));
    }

    // Admin
    if (t?.classList?.contains("js-admin-edit")) {
      const id = t.getAttribute("data-id");
      const username = t.getAttribute("data-username") || "";
      const role = t.getAttribute("data-role") || "admin";
      adminEditUser(id, username, role).catch((e) => alert(e.message));
    }

    if (t?.classList?.contains("js-admin-del")) {
      const id = t.getAttribute("data-id");
      const username = t.getAttribute("data-username") || "";
      adminDeleteUser(id, username).catch((e) => alert(e.message));
    }
  });

  window.addEventListener("hashchange", () => onRouteChange().catch(() => {}));

  // Boot
  try {
    await checkAuth();
    showLogin(false);
    await onRouteChange();
  } catch {
    showLogin(true);
    showView("dashboard"); // mostra layout, mas bloqueia API
  }
});

