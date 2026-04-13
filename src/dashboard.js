import express, { Router } from 'express';
import { getAllClienti, getConversazioni, updateClienteDiretto } from './db.js';

export const dashboardRouter = Router();

// ── Basic Auth ────────────────────────────────────────
dashboardRouter.use((req, res, next) => {
  const password = process.env.CRM_PASSWORD;
  if (!password) return next();
  const username = process.env.CRM_USER || '';
  const auth = req.headers['authorization'];
  if (!auth?.startsWith('Basic '))
    return res.set('WWW-Authenticate', 'Basic realm="CRM"').status(401).end();
  const decoded = Buffer.from(auth.split(' ')[1], 'base64').toString();
  const colon = decoded.indexOf(':');
  const user = decoded.slice(0, colon);
  const pwd  = decoded.slice(colon + 1);
  if (pwd !== password || (username && user !== username))
    return res.set('WWW-Authenticate', 'Basic realm="CRM"').status(401).end();
  next();
});

dashboardRouter.use(express.json());

dashboardRouter.get('/api/clienti', (_req, res) => {
  try { res.json(getAllClienti()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

dashboardRouter.get('/api/conversazioni', (req, res) => {
  const { telefono } = req.query;
  if (!telefono) return res.status(400).json({ error: 'telefono richiesto' });
  try { res.json(getConversazioni(telefono)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

dashboardRouter.patch('/api/clienti/:telefono', (req, res) => {
  try { updateClienteDiretto(req.params.telefono, req.body); res.json({ ok: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

dashboardRouter.get('/', (_req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(HTML);
});

const HTML = `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>CRM Dashboard</title>
<style>
:root {
  --bg: #f1f5f9;
  --surface: #ffffff;
  --border: #e2e8f0;
  --text: #0f172a;
  --muted: #64748b;
  --accent: #6366f1;
  --accent-light: #eef2ff;
  --green: #10b981;
  --green-light: #d1fae5;
  --amber: #f59e0b;
  --amber-light: #fef3c7;
  --red: #ef4444;
  --red-light: #fee2e2;
  --radius: 12px;
  --shadow: 0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04);
  --shadow-lg: 0 10px 40px rgba(0,0,0,.12);
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; font-size: 14px; line-height: 1.5; }

/* ── Header ── */
header {
  background: var(--text);
  color: #fff;
  padding: 0 24px;
  height: 56px;
  display: flex;
  align-items: center;
  gap: 16px;
  position: sticky;
  top: 0;
  z-index: 50;
}
header h1 { font-size: 15px; font-weight: 700; letter-spacing: -0.01em; }
header .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--green); box-shadow: 0 0 0 2px rgba(16,185,129,.3); animation: pulse 2s infinite; }
@keyframes pulse { 0%,100%{box-shadow:0 0 0 2px rgba(16,185,129,.3)} 50%{box-shadow:0 0 0 5px rgba(16,185,129,.1)} }
.header-right { margin-left: auto; display: flex; align-items: center; gap: 12px; }
#lastRefresh { font-size: 11px; color: rgba(255,255,255,.4); }
.refresh-btn { background: rgba(255,255,255,.1); border: none; color: #fff; width: 30px; height: 30px; border-radius: 8px; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; transition: background .15s; }
.refresh-btn:hover { background: rgba(255,255,255,.2); }

/* ── Layout ── */
.main { padding: 20px 24px; max-width: 1400px; margin: 0 auto; }

/* ── Stats ── */
.stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
.stat-card { background: var(--surface); border-radius: var(--radius); padding: 16px 20px; box-shadow: var(--shadow); border: 1px solid var(--border); }
.stat-card .label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); margin-bottom: 6px; }
.stat-card .value { font-size: 28px; font-weight: 700; line-height: 1; letter-spacing: -0.02em; }
.stat-card.blue .value { color: var(--accent); }
.stat-card.green .value { color: var(--green); }
.stat-card.amber .value { color: var(--amber); }
.stat-card.red .value { color: var(--red); }

/* ── Toolbar ── */
.toolbar { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
.search-wrap { position: relative; flex: 1; min-width: 200px; max-width: 320px; }
.search-wrap svg { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--muted); pointer-events: none; }
#search { width: 100%; padding: 8px 12px 8px 34px; border: 1px solid var(--border); border-radius: 8px; font-size: 13px; outline: none; background: var(--surface); transition: border-color .15s, box-shadow .15s; }
#search:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(99,102,241,.15); }
.filters { display: flex; gap: 6px; flex-wrap: wrap; }
.filter-pill { padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; cursor: pointer; border: 1.5px solid var(--border); background: var(--surface); color: var(--muted); transition: all .15s; white-space: nowrap; }
.filter-pill:hover { border-color: var(--accent); color: var(--accent); }
.filter-pill.active { background: var(--accent); border-color: var(--accent); color: #fff; }
.filter-pill.pill-richiamare.active { background: #4f46e5; border-color: #4f46e5; }
.filter-pill.pill-trattativa.active { background: var(--green); border-color: var(--green); }
.filter-pill.pill-perso.active { background: var(--red); border-color: var(--red); }
.spacer { flex: 1; }
.count-label { font-size: 12px; color: var(--muted); white-space: nowrap; }

/* ── Table card ── */
.card { background: var(--surface); border-radius: var(--radius); box-shadow: var(--shadow); border: 1px solid var(--border); overflow: hidden; }
table { width: 100%; border-collapse: collapse; }
thead th { background: #f8fafc; padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .06em; border-bottom: 1px solid var(--border); white-space: nowrap; }
tbody tr { border-bottom: 1px solid #f1f5f9; cursor: pointer; transition: background .1s; }
tbody tr:last-child { border-bottom: none; }
tbody tr:hover { background: #fafbff; }
tbody td { padding: 11px 14px; vertical-align: middle; }
td.phone { font-weight: 600; font-size: 13px; font-family: 'SF Mono', 'Fira Code', monospace; }
td.nome-cell { font-weight: 500; }
.row-actions { display: flex; gap: 6px; opacity: 0; transition: opacity .15s; }
tbody tr:hover .row-actions { opacity: 1; }
.row-btn { width: 28px; height: 28px; border-radius: 6px; border: 1px solid var(--border); background: var(--surface); cursor: pointer; font-size: 13px; display: flex; align-items: center; justify-content: center; color: var(--muted); transition: all .15s; }
.row-btn:hover { background: var(--accent-light); border-color: var(--accent); color: var(--accent); }
.row-btn.chat:hover { background: #f0fdf4; border-color: var(--green); color: var(--green); }

/* ── Badges ── */
.badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: .02em; }
.badge::before { content:''; width:5px; height:5px; border-radius:50%; }
.badge-nuovo      { background: #f1f5f9; color: #475569; }
.badge-nuovo::before { background: #94a3b8; }
.badge-richiamare { background: var(--accent-light); color: #4338ca; }
.badge-richiamare::before { background: var(--accent); }
.badge-trattativa { background: var(--green-light); color: #065f46; }
.badge-trattativa::before { background: var(--green); }
.badge-perso      { background: var(--red-light); color: #991b1b; }
.badge-perso::before { background: var(--red); }

/* ── Empty / Spinner ── */
.empty { text-align: center; padding: 60px 24px; color: var(--muted); }
.empty svg { margin-bottom: 12px; opacity: .3; }
.empty p { font-size: 14px; }
.spinner { text-align: center; padding: 48px; color: var(--muted); font-size: 13px; }

/* ── Chat view ── */
.chat-wrap { display: flex; flex-direction: column; height: 100%; }
.chat-topbar { padding: 14px 20px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 12px; }
.chat-topbar .back-btn { display: flex; align-items: center; gap: 5px; font-size: 12px; color: var(--accent); cursor: pointer; text-decoration: none; font-weight: 600; padding: 5px 10px; border-radius: 6px; border: 1.5px solid var(--accent-light); background: var(--accent-light); transition: background .15s; }
.chat-topbar .back-btn:hover { background: #e0e7ff; }
.chat-phone { font-weight: 700; font-size: 14px; font-family: 'SF Mono', monospace; }
.chat-body { padding: 20px; display: flex; flex-direction: column; gap: 12px; max-height: 65vh; overflow-y: auto; flex: 1; }
.bubble { max-width: 75%; display: flex; flex-direction: column; }
.bubble.user { align-self: flex-end; align-items: flex-end; }
.bubble.assistant { align-self: flex-start; align-items: flex-start; }
.bubble-text { padding: 10px 14px; border-radius: 16px; font-size: 13.5px; line-height: 1.55; white-space: pre-wrap; word-break: break-word; }
.bubble.user .bubble-text { background: var(--text); color: #fff; border-bottom-right-radius: 4px; }
.bubble.assistant .bubble-text { background: #f1f5f9; color: var(--text); border-bottom-left-radius: 4px; }
.bubble-meta { font-size: 10px; color: var(--muted); margin-top: 3px; padding: 0 4px; }

/* ── Modal ── */
.overlay { display: none; position: fixed; inset: 0; background: rgba(15,23,42,.5); z-index: 200; align-items: center; justify-content: center; backdrop-filter: blur(2px); }
.overlay.open { display: flex; }
.modal { background: var(--surface); border-radius: 16px; width: min(540px, 95vw); max-height: 92vh; overflow-y: auto; box-shadow: var(--shadow-lg); border: 1px solid var(--border); }
.modal-head { padding: 20px 24px 16px; border-bottom: 1px solid var(--border); display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.modal-head-info { flex: 1; min-width: 0; }
.modal-head-info h2 { font-size: 16px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.modal-head-info .modal-phone { font-size: 12px; font-family: 'SF Mono', monospace; color: var(--muted); margin-top: 2px; }
.modal-head-actions { display: flex; gap: 8px; flex-shrink: 0; }
.modal-close { background: #f1f5f9; border: none; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; font-size: 16px; color: var(--muted); display: flex; align-items: center; justify-content: center; transition: background .15s; }
.modal-close:hover { background: var(--border); }
.chat-link-btn { background: #f0fdf4; border: 1.5px solid #a7f3d0; color: #065f46; font-size: 12px; font-weight: 600; padding: 5px 10px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 5px; transition: background .15s; }
.chat-link-btn:hover { background: var(--green-light); }
.modal-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 16px; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-group { display: flex; flex-direction: column; gap: 5px; }
.form-group label { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .06em; }
.form-group input, .form-group select {
  padding: 9px 11px; border: 1.5px solid var(--border); border-radius: 8px;
  font-size: 13.5px; outline: none; font-family: inherit; background: #fafafa;
  transition: border-color .15s, box-shadow .15s;
}
.form-group input:focus, .form-group select:focus {
  border-color: var(--accent); background: #fff;
  box-shadow: 0 0 0 3px rgba(99,102,241,.12);
}
.stato-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.stato-opt { position: relative; }
.stato-opt input[type=radio] { position: absolute; opacity: 0; width: 0; height: 0; }
.stato-opt label {
  display: block; text-align: center; padding: 8px 4px; border-radius: 8px;
  border: 1.5px solid var(--border); font-size: 11px; font-weight: 700;
  cursor: pointer; transition: all .15s; color: var(--muted); background: #fafafa;
}
.stato-opt input:checked + label { border-color: currentColor; background: currentColor; color: #fff; }
.stato-opt.s-nuovo label { color: #475569; }
.stato-opt.s-nuovo input:checked + label { background: #475569; border-color: #475569; color: #fff; }
.stato-opt.s-richiamare label { color: var(--accent); }
.stato-opt.s-richiamare input:checked + label { background: var(--accent); border-color: var(--accent); color: #fff; }
.stato-opt.s-trattativa label { color: var(--green); }
.stato-opt.s-trattativa input:checked + label { background: var(--green); border-color: var(--green); color: #fff; }
.stato-opt.s-perso label { color: var(--red); }
.stato-opt.s-perso input:checked + label { background: var(--red); border-color: var(--red); color: #fff; }
.divider { height: 1px; background: var(--border); }
.modal-footer { padding: 0 24px 20px; display: flex; gap: 10px; justify-content: flex-end; }
.btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 18px; border-radius: 9px; border: none; font-size: 13px; font-weight: 600; cursor: pointer; transition: all .15s; font-family: inherit; }
.btn-primary { background: var(--accent); color: #fff; }
.btn-primary:hover { background: #4f46e5; }
.btn-ghost { background: #f1f5f9; color: var(--text); }
.btn-ghost:hover { background: var(--border); }
.btn-save { background: var(--green); color: #fff; }
.btn-save:hover { background: #059669; }
.toast { position: fixed; bottom: 24px; right: 24px; background: var(--text); color: #fff; padding: 12px 20px; border-radius: 10px; font-size: 13px; font-weight: 500; z-index: 300; transform: translateY(80px); opacity: 0; transition: all .3s cubic-bezier(.34,1.56,.64,1); pointer-events: none; }
.toast.show { transform: translateY(0); opacity: 1; }

/* ── Tabs (chat section) ── */
.section-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.section-title { font-size: 13px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .06em; }

/* ── Responsive ── */
@media (max-width: 768px) {
  .main { padding: 12px; }
  .stats { grid-template-columns: repeat(2, 1fr); }
  .form-row { grid-template-columns: 1fr; }
  thead th:nth-child(n+5) { display: none; }
  tbody td:nth-child(n+5) { display: none; }
  .row-actions { opacity: 1; }
}
@media (max-width: 480px) {
  .stats { grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .stat-card { padding: 12px 14px; }
  .stato-grid { grid-template-columns: repeat(2,1fr); }
}
</style>
</head>
<body>

<header>
  <div class="dot"></div>
  <h1>CRM Dashboard</h1>
  <div class="header-right">
    <span id="lastRefresh"></span>
    <button class="refresh-btn" onclick="loadClienti()" title="Aggiorna">↻</button>
  </div>
</header>

<div class="main">

  <!-- Stats -->
  <div class="stats">
    <div class="stat-card">
      <div class="label">Totale clienti</div>
      <div class="value" id="statTot">—</div>
    </div>
    <div class="stat-card blue">
      <div class="label">Da richiamare</div>
      <div class="value" id="statRich">—</div>
    </div>
    <div class="stat-card green">
      <div class="label">In trattativa</div>
      <div class="value" id="statTrat">—</div>
    </div>
    <div class="stat-card red">
      <div class="label">Persi</div>
      <div class="value" id="statPerso">—</div>
    </div>
  </div>

  <!-- Toolbar -->
  <div class="toolbar">
    <div class="search-wrap">
      <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
      <input id="search" type="text" placeholder="Cerca nome, telefono, servizio…" oninput="filterClienti()">
    </div>
    <div class="filters">
      <span class="filter-pill active" data-filter="tutti" onclick="setFilter('tutti',this)">Tutti</span>
      <span class="filter-pill" data-filter="Nuovo" onclick="setFilter('Nuovo',this)">Nuovo</span>
      <span class="filter-pill pill-richiamare" data-filter="Da richiamare" onclick="setFilter('Da richiamare',this)">Da richiamare</span>
      <span class="filter-pill pill-trattativa" data-filter="In trattativa" onclick="setFilter('In trattativa',this)">In trattativa</span>
      <span class="filter-pill pill-perso" data-filter="Perso" onclick="setFilter('Perso',this)">Perso</span>
    </div>
    <span class="spacer"></span>
    <span class="count-label" id="countClienti"></span>
  </div>

  <!-- Table -->
  <div class="card" id="tableCard">
    <div id="clientiContent"><div class="spinner">Caricamento…</div></div>
  </div>

  <!-- Chat panel (hidden by default) -->
  <div id="chatPanel" style="display:none; margin-top:16px;">
    <div class="card" id="chatBox"></div>
  </div>

</div>

<!-- Modal edit -->
<div class="overlay" id="overlay" onclick="overlayClick(event)">
  <div class="modal" id="modal">
    <div class="modal-head">
      <div class="modal-head-info">
        <h2 id="modalName">Cliente</h2>
        <div class="modal-phone" id="modalPhone"></div>
      </div>
      <div class="modal-head-actions">
        <button class="chat-link-btn" onclick="goToChat()">&#128172; Chat</button>
        <button class="modal-close" onclick="closeModal()">&#x2715;</button>
      </div>
    </div>
    <form id="editForm" onsubmit="saveCliente(event)">
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group">
            <label>Nome</label>
            <input name="nome" type="text" placeholder="Nome cliente">
          </div>
          <div class="form-group">
            <label>Email</label>
            <input name="email" type="email" placeholder="email@esempio.it">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Data evento</label>
            <input name="data_evento" type="text" placeholder="es. 2025-06-15">
          </div>
          <div class="form-group">
            <label>Location</label>
            <input name="location" type="text" placeholder="Luogo">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Servizio</label>
            <input name="servizio" type="text" placeholder="Tipo di servizio">
          </div>
          <div class="form-group">
            <label>Budget</label>
            <input name="budget" type="text" placeholder="es. 1500€">
          </div>
        </div>
        <div class="divider"></div>
        <div class="form-group">
          <label>Stato</label>
          <div class="stato-grid">
            <div class="stato-opt s-nuovo">
              <input type="radio" name="stato" id="s1" value="Nuovo">
              <label for="s1">Nuovo</label>
            </div>
            <div class="stato-opt s-richiamare">
              <input type="radio" name="stato" id="s2" value="Da richiamare">
              <label for="s2">Da richiamare</label>
            </div>
            <div class="stato-opt s-trattativa">
              <input type="radio" name="stato" id="s3" value="In trattativa">
              <label for="s3">In trattativa</label>
            </div>
            <div class="stato-opt s-perso">
              <input type="radio" name="stato" id="s4" value="Perso">
              <label for="s4">Perso</label>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Annulla</button>
        <button type="submit" class="btn btn-save">Salva modifiche</button>
      </div>
    </form>
  </div>
</div>

<!-- Toast -->
<div class="toast" id="toast"></div>

<script>
let allClienti = [];
let currentFilter = 'tutti';
let currentTelefono = null;

// ── Stats ──────────────────────────────────────────
function updateStats(list) {
  document.getElementById('statTot').textContent   = list.length;
  document.getElementById('statRich').textContent  = list.filter(c => c.stato === 'Da richiamare').length;
  document.getElementById('statTrat').textContent  = list.filter(c => c.stato === 'In trattativa').length;
  document.getElementById('statPerso').textContent = list.filter(c => c.stato === 'Perso').length;
}

// ── Filters ────────────────────────────────────────
function setFilter(f, el) {
  currentFilter = f;
  document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  filterClienti();
}

function filterClienti() {
  const q = document.getElementById('search').value.toLowerCase().trim();
  let list = allClienti;
  if (currentFilter !== 'tutti') list = list.filter(c => (c.stato || 'Nuovo') === currentFilter);
  if (q) list = list.filter(c =>
    (c.telefono||'').includes(q) ||
    (c.nome||'').toLowerCase().includes(q) ||
    (c.servizio||'').toLowerCase().includes(q) ||
    (c.location||'').toLowerCase().includes(q) ||
    (c.email||'').toLowerCase().includes(q)
  );
  renderClienti(list);
}

// ── Render ─────────────────────────────────────────
function badgeCls(stato) {
  if (stato === 'Da richiamare') return 'badge-richiamare';
  if (stato === 'In trattativa') return 'badge-trattativa';
  if (stato === 'Perso') return 'badge-perso';
  return 'badge-nuovo';
}

function dash(v) { return v ? escHtml(v) : '<span style="color:var(--border)">—</span>'; }

function renderClienti(list) {
  const el = document.getElementById('clientiContent');
  if (!list.length) {
    el.innerHTML = \`<div class="empty">
      <svg width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
      <p>Nessun cliente trovato.</p>
    </div>\`;
    document.getElementById('countClienti').textContent = '';
    return;
  }
  el.innerHTML = \`<table>
    <thead><tr>
      <th>Telefono</th><th>Nome</th><th>Stato</th><th>Servizio</th>
      <th>Data evento</th><th>Budget</th><th>Creato</th><th></th>
    </tr></thead>
    <tbody>\` + list.map(c => {
      const tel = escAttr(c.telefono);
      return \`<tr onclick="openModal('\${tel}')">
        <td class="phone">\${escHtml(c.telefono)}</td>
        <td class="nome-cell">\${dash(c.nome)}</td>
        <td><span class="badge \${badgeCls(c.stato)}">\${escHtml(c.stato||'Nuovo')}</span></td>
        <td>\${dash(c.servizio)}</td>
        <td>\${dash(c.data_evento)}</td>
        <td>\${dash(c.budget)}</td>
        <td style="color:var(--muted);font-size:12px">\${c.created_at ? c.created_at.slice(0,10) : '—'}</td>
        <td onclick="event.stopPropagation()">
          <div class="row-actions">
            <button class="row-btn" title="Modifica" onclick="openModal('\${tel}')">✎</button>
            <button class="row-btn chat" title="Chat" onclick="openChat('\${tel}')">💬</button>
          </div>
        </td>
      </tr>\`;
    }).join('') + '</tbody></table>';
  document.getElementById('countClienti').textContent = list.length + ' risultat' + (list.length === 1 ? 'o' : 'i');
}

// ── Load ───────────────────────────────────────────
async function loadClienti() {
  try {
    const r = await fetch('/crm/api/clienti');
    if (!r.ok) throw new Error('HTTP ' + r.status);
    allClienti = await r.json();
    updateStats(allClienti);
    filterClienti();
    document.getElementById('lastRefresh').textContent = new Date().toLocaleTimeString('it-IT', {hour:'2-digit',minute:'2-digit'});
  } catch(e) {
    document.getElementById('clientiContent').innerHTML = '<div class="empty"><p>Errore nel caricamento.</p></div>';
  }
}

// ── Modal ──────────────────────────────────────────
function openModal(telefono) {
  currentTelefono = telefono;
  const c = allClienti.find(x => x.telefono === telefono);
  document.getElementById('modalName').textContent = c?.nome || telefono;
  document.getElementById('modalPhone').textContent = c?.nome ? '+' + telefono : '';
  const form = document.getElementById('editForm');
  form.nome.value       = c?.nome || '';
  form.email.value      = c?.email || '';
  form.data_evento.value = c?.data_evento || '';
  form.location.value   = c?.location || '';
  form.servizio.value   = c?.servizio || '';
  form.budget.value     = c?.budget || '';
  const stato = c?.stato || 'Nuovo';
  form.querySelectorAll('[name=stato]').forEach(r => r.checked = (r.value === stato));
  document.getElementById('overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('overlay').classList.remove('open');
  document.body.style.overflow = '';
  currentTelefono = null;
}

function overlayClick(e) {
  if (e.target === document.getElementById('overlay')) closeModal();
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

function goToChat() {
  const tel = currentTelefono;
  closeModal();
  openChat(tel);
}

async function saveCliente(e) {
  e.preventDefault();
  if (!currentTelefono) return;
  const form = e.target;
  const stato = form.querySelector('[name=stato]:checked')?.value || 'Nuovo';
  const body = {
    nome: form.nome.value.trim() || null,
    email: form.email.value.trim() || null,
    data_evento: form.data_evento.value.trim() || null,
    location: form.location.value.trim() || null,
    servizio: form.servizio.value.trim() || null,
    budget: form.budget.value.trim() || null,
    stato,
  };
  try {
    const r = await fetch('/crm/api/clienti/' + encodeURIComponent(currentTelefono), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(await r.text());
    closeModal();
    await loadClienti();
    showToast('Salvato');
  } catch(err) {
    showToast('Errore: ' + err.message, true);
  }
}

// ── Chat ───────────────────────────────────────────
async function openChat(telefono) {
  const panel = document.getElementById('chatPanel');
  panel.style.display = 'block';
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.getElementById('chatBox').innerHTML = '<div class="spinner">Caricamento…</div>';
  try {
    const r = await fetch('/crm/api/conversazioni?telefono=' + encodeURIComponent(telefono));
    const msgs = await r.json();
    const header = \`<div class="chat-topbar">
      <button class="back-btn" onclick="closeChat()">← Torna ai clienti</button>
      <span class="chat-phone">+\${escHtml(telefono)}</span>
    </div>\`;
    if (!msgs.length) {
      document.getElementById('chatBox').innerHTML = header + '<div class="empty"><p>Nessun messaggio.</p></div>';
      return;
    }
    const bubbles = msgs.map(m => \`
      <div class="bubble \${m.ruolo}">
        <div class="bubble-text">\${escHtml(m.messaggio)}</div>
        <div class="bubble-meta">\${m.created_at ? m.created_at.slice(0,16).replace('T',' ') : ''}</div>
      </div>\`).join('');
    document.getElementById('chatBox').innerHTML = header + \`<div class="chat-body">\${bubbles}</div>\`;
    const body = document.querySelector('.chat-body');
    if (body) body.scrollTop = body.scrollHeight;
  } catch(e) {
    document.getElementById('chatBox').innerHTML = '<div class="empty"><p>Errore nel caricamento.</p></div>';
  }
}

function closeChat() {
  document.getElementById('chatPanel').style.display = 'none';
}

// ── Toast ──────────────────────────────────────────
let toastTimer;
function showToast(msg, err) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.background = err ? 'var(--red)' : '#1e293b';
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
}

// ── Utils ──────────────────────────────────────────
function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function escAttr(s) { return String(s).replace(/'/g,"\\'"); }

// ── Init ───────────────────────────────────────────
loadClienti();
setInterval(loadClienti, 30000);
</script>
</body>
</html>`;
