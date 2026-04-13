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
  try {
    const clienti = getAllClienti();
    res.json(clienti);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

dashboardRouter.get('/api/conversazioni', (req, res) => {
  const { telefono } = req.query;
  if (!telefono) return res.status(400).json({ error: 'telefono richiesto' });
  try {
    const msgs = getConversazioni(telefono);
    res.json(msgs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

dashboardRouter.patch('/api/clienti/:telefono', (req, res) => {
  try {
    updateClienteDiretto(req.params.telefono, req.body);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
<title>Mario Agent — CRM</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f4f5f7; color: #1a1a2e; min-height: 100vh; }
  header { background: #1a1a2e; color: #fff; padding: 16px 24px; display: flex; align-items: center; gap: 12px; }
  header h1 { font-size: 1.1rem; font-weight: 600; letter-spacing: 0.02em; }
  header span { font-size: 0.8rem; opacity: 0.5; }
  .tabs { display: flex; gap: 0; border-bottom: 2px solid #dde1e7; background: #fff; padding: 0 24px; }
  .tab { padding: 12px 20px; cursor: pointer; font-size: 0.9rem; font-weight: 500; color: #666; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: color 0.15s; }
  .tab.active { color: #1a1a2e; border-bottom-color: #1a1a2e; }
  .tab:hover:not(.active) { color: #333; }
  .panel { display: none; padding: 24px; }
  .panel.active { display: block; }
  .toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
  .toolbar input { padding: 8px 12px; border: 1px solid #dde1e7; border-radius: 6px; font-size: 0.9rem; width: 280px; outline: none; }
  .toolbar input:focus { border-color: #1a1a2e; }
  .toolbar .count { font-size: 0.82rem; color: #888; margin-left: auto; }
  .card { background: #fff; border-radius: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); overflow: hidden; }
  table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
  thead th { background: #f8f9fb; padding: 10px 14px; text-align: left; font-weight: 600; color: #555; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #eee; white-space: nowrap; }
  tbody tr { border-bottom: 1px solid #f0f0f0; cursor: pointer; transition: background 0.1s; }
  tbody tr:last-child { border-bottom: none; }
  tbody tr:hover { background: #f8f9ff; }
  tbody td { padding: 10px 14px; vertical-align: middle; }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; }
  .badge-nuovo      { background: #e8e8e8; color: #555; }
  .badge-richiamare { background: #dbeafe; color: #1d4ed8; }
  .badge-trattativa { background: #dcfce7; color: #15803d; }
  .badge-perso      { background: #fee2e2; color: #b91c1c; }
  .empty { text-align: center; padding: 48px; color: #aaa; font-size: 0.9rem; }
  .chat-header { padding: 16px 20px; border-bottom: 1px solid #eee; display: flex; align-items: center; gap: 10px; }
  .chat-header .phone { font-weight: 600; font-size: 0.95rem; }
  .chat-header .back { cursor: pointer; font-size: 0.82rem; color: #1d4ed8; text-decoration: underline; }
  .chat-body { padding: 16px 20px; display: flex; flex-direction: column; gap: 10px; max-height: 60vh; overflow-y: auto; }
  .bubble { max-width: 72%; padding: 10px 14px; border-radius: 14px; font-size: 0.875rem; line-height: 1.5; white-space: pre-wrap; }
  .bubble.user      { align-self: flex-end; background: #1a1a2e; color: #fff; border-bottom-right-radius: 4px; }
  .bubble.assistant { align-self: flex-start; background: #f0f0f0; color: #1a1a2e; border-bottom-left-radius: 4px; }
  .bubble .ts { display: block; font-size: 0.7rem; opacity: 0.55; margin-top: 4px; text-align: right; }
  .spinner { text-align: center; padding: 32px; color: #aaa; }

  /* ── Modale ── */
  .overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 100; align-items: center; justify-content: center; }
  .overlay.open { display: flex; }
  .modal { background: #fff; border-radius: 12px; width: min(520px, 94vw); max-height: 90vh; overflow-y: auto; box-shadow: 0 8px 32px rgba(0,0,0,0.18); }
  .modal-header { padding: 20px 24px 0; display: flex; align-items: center; justify-content: space-between; }
  .modal-header h2 { font-size: 1rem; font-weight: 700; }
  .modal-close { background: none; border: none; font-size: 1.4rem; cursor: pointer; color: #888; line-height: 1; }
  .modal-actions { display: flex; gap: 10px; padding: 20px 24px; border-bottom: 1px solid #eee; }
  .btn { padding: 9px 18px; border-radius: 7px; border: none; font-size: 0.875rem; font-weight: 600; cursor: pointer; transition: opacity 0.15s; }
  .btn:hover { opacity: 0.85; }
  .btn-primary { background: #1a1a2e; color: #fff; }
  .btn-outline { background: #fff; color: #1a1a2e; border: 1.5px solid #1a1a2e; }
  .btn-success { background: #15803d; color: #fff; }
  .btn-danger  { background: #b91c1c; color: #fff; }
  .modal-form { padding: 20px 24px; display: none; flex-direction: column; gap: 14px; }
  .modal-form.open { display: flex; }
  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .form-group { display: flex; flex-direction: column; gap: 4px; }
  .form-group label { font-size: 0.78rem; font-weight: 600; color: #555; text-transform: uppercase; letter-spacing: 0.04em; }
  .form-group input, .form-group select { padding: 8px 10px; border: 1px solid #dde1e7; border-radius: 6px; font-size: 0.9rem; outline: none; font-family: inherit; }
  .form-group input:focus, .form-group select:focus { border-color: #1a1a2e; }
  .form-footer { display: flex; gap: 10px; justify-content: flex-end; padding: 0 24px 20px; }

  @media (max-width: 600px) {
    .panel { padding: 12px; }
    .toolbar input { width: 100%; }
    .toolbar { flex-wrap: wrap; }
    thead th:nth-child(n+4) { display: none; }
    tbody td:nth-child(n+4) { display: none; }
    .form-row { grid-template-columns: 1fr; }
  }
</style>
</head>
<body>
<header>
  <h1>Mario Agent — CRM</h1>
  <span id="lastRefresh"></span>
</header>
<div class="tabs">
  <div class="tab active" onclick="showTab('clienti')">Clienti</div>
  <div class="tab" onclick="showTab('conversazioni')">Conversazioni</div>
</div>

<div id="panel-clienti" class="panel active">
  <div class="toolbar">
    <input id="search" type="text" placeholder="Cerca per nome, telefono, servizio..." oninput="filterClienti()">
    <span class="count" id="countClienti"></span>
  </div>
  <div class="card">
    <div id="clientiContent"><div class="spinner">Caricamento...</div></div>
  </div>
</div>

<div id="panel-conversazioni" class="panel">
  <div class="card" id="chatBox">
    <div class="empty">Seleziona un cliente dalla tabella per vedere la conversazione.</div>
  </div>
</div>

<!-- Modale cliente -->
<div class="overlay" id="overlay" onclick="closeModal(event)">
  <div class="modal" id="modal">
    <div class="modal-header">
      <h2 id="modalTitle">Cliente</h2>
      <button class="modal-close" onclick="closeModalDirect()">&#x2715;</button>
    </div>
    <div class="modal-actions">
      <button class="btn btn-primary" onclick="openEditForm()">&#9998; Modifica</button>
      <button class="btn btn-outline" onclick="goToConversazione()">&#128172; Conversazione</button>
    </div>
    <form class="modal-form" id="editForm" onsubmit="saveCliente(event)">
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
      <div class="form-group">
        <label>Stato</label>
        <select name="stato">
          <option value="Nuovo">Nuovo</option>
          <option value="Da richiamare">Da richiamare</option>
          <option value="In trattativa">In trattativa</option>
          <option value="Perso">Perso</option>
        </select>
      </div>
      <div class="form-footer">
        <button type="button" class="btn btn-outline" onclick="closeEditForm()">Annulla</button>
        <button type="submit" class="btn btn-success">Salva</button>
      </div>
    </form>
  </div>
</div>

<script>
let allClienti = [];
let currentTelefono = null;

function showTab(name) {
  document.querySelectorAll('.tab').forEach((t, i) => t.classList.toggle('active', ['clienti','conversazioni'][i] === name));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-' + name).classList.add('active');
}

function badgeClass(stato) {
  if (!stato) return 'badge-nuovo';
  if (stato === 'Da richiamare') return 'badge-richiamare';
  if (stato === 'In trattativa') return 'badge-trattativa';
  if (stato === 'Perso') return 'badge-perso';
  return 'badge-nuovo';
}

function fmt(val) { return val || '<span style="color:#ccc">—</span>'; }

function renderClienti(list) {
  const el = document.getElementById('clientiContent');
  if (!list.length) { el.innerHTML = '<div class="empty">Nessun cliente.</div>'; return; }
  el.innerHTML = \`<table>
    <thead><tr>
      <th>Telefono</th><th>Nome</th><th>Stato</th><th>Servizio</th>
      <th>Data evento</th><th>Location</th><th>Budget</th><th>Email</th><th>Creato</th>
    </tr></thead>
    <tbody>\` +
    list.map(c => \`<tr onclick="openModal('\${escAttr(c.telefono)}')">
      <td><strong>\${escHtml(c.telefono)}</strong></td>
      <td>\${fmt(c.nome ? escHtml(c.nome) : null)}</td>
      <td><span class="badge \${badgeClass(c.stato)}">\${escHtml(c.stato || 'Nuovo')}</span></td>
      <td>\${fmt(c.servizio ? escHtml(c.servizio) : null)}</td>
      <td>\${fmt(c.data_evento ? escHtml(c.data_evento) : null)}</td>
      <td>\${fmt(c.location ? escHtml(c.location) : null)}</td>
      <td>\${fmt(c.budget ? escHtml(c.budget) : null)}</td>
      <td>\${fmt(c.email ? escHtml(c.email) : null)}</td>
      <td>\${c.created_at ? c.created_at.slice(0,16) : '—'}</td>
    </tr>\`).join('') +
    '</tbody></table>';
  document.getElementById('countClienti').textContent = list.length + ' client' + (list.length === 1 ? 'e' : 'i');
}

function filterClienti() {
  const q = document.getElementById('search').value.toLowerCase();
  const filtered = q ? allClienti.filter(c =>
    (c.telefono||'').includes(q) ||
    (c.nome||'').toLowerCase().includes(q) ||
    (c.servizio||'').toLowerCase().includes(q) ||
    (c.location||'').toLowerCase().includes(q) ||
    (c.stato||'').toLowerCase().includes(q)
  ) : allClienti;
  renderClienti(filtered);
}

async function loadClienti() {
  try {
    const r = await fetch('/crm/api/clienti');
    allClienti = await r.json();
    filterClienti();
    document.getElementById('lastRefresh').textContent = 'aggiornato ' + new Date().toLocaleTimeString('it-IT');
  } catch(e) {
    document.getElementById('clientiContent').innerHTML = '<div class="empty">Errore nel caricamento.</div>';
  }
}

function openModal(telefono) {
  currentTelefono = telefono;
  const cliente = allClienti.find(c => c.telefono === telefono);
  document.getElementById('modalTitle').textContent = (cliente?.nome || telefono);
  closeEditForm();
  if (cliente) {
    const form = document.getElementById('editForm');
    form.nome.value = cliente.nome || '';
    form.email.value = cliente.email || '';
    form.data_evento.value = cliente.data_evento || '';
    form.location.value = cliente.location || '';
    form.servizio.value = cliente.servizio || '';
    form.budget.value = cliente.budget || '';
    form.stato.value = cliente.stato || 'Nuovo';
  }
  document.getElementById('overlay').classList.add('open');
}

function closeModal(e) {
  if (e.target === document.getElementById('overlay')) closeModalDirect();
}

function closeModalDirect() {
  document.getElementById('overlay').classList.remove('open');
  currentTelefono = null;
  closeEditForm();
}

function openEditForm() {
  document.getElementById('editForm').classList.add('open');
}

function closeEditForm() {
  document.getElementById('editForm').classList.remove('open');
}

function goToConversazione() {
  const tel = currentTelefono;
  closeModalDirect();
  loadConversazione(tel);
}

async function saveCliente(e) {
  e.preventDefault();
  if (!currentTelefono) return;
  const form = e.target;
  const body = {
    nome: form.nome.value || null,
    email: form.email.value || null,
    data_evento: form.data_evento.value || null,
    location: form.location.value || null,
    servizio: form.servizio.value || null,
    budget: form.budget.value || null,
    stato: form.stato.value,
  };
  try {
    const r = await fetch('/crm/api/clienti/' + encodeURIComponent(currentTelefono), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(await r.text());
    closeModalDirect();
    await loadClienti();
  } catch(err) {
    alert('Errore nel salvataggio: ' + err.message);
  }
}

async function loadConversazione(telefono) {
  showTab('conversazioni');
  document.getElementById('chatBox').innerHTML = '<div class="spinner">Caricamento...</div>';
  try {
    const r = await fetch('/crm/api/conversazioni?telefono=' + encodeURIComponent(telefono));
    const msgs = await r.json();
    if (!msgs.length) {
      document.getElementById('chatBox').innerHTML = \`
        <div class="chat-header"><span class="phone">\${escHtml(telefono)}</span><span class="back" onclick="showTab('clienti')">← Clienti</span></div>
        <div class="empty">Nessun messaggio.</div>\`;
      return;
    }
    const bubbles = msgs.map(m => \`
      <div class="bubble \${m.ruolo}">
        \${escHtml(m.messaggio)}
        <span class="ts">\${m.created_at ? m.created_at.slice(0,16) : ''}</span>
      </div>\`).join('');
    document.getElementById('chatBox').innerHTML = \`
      <div class="chat-header">
        <span class="phone">\${escHtml(telefono)}</span>
        <span class="back" onclick="showTab('clienti')">← Clienti</span>
      </div>
      <div class="chat-body">\${bubbles}</div>\`;
    const body = document.querySelector('.chat-body');
    if (body) body.scrollTop = body.scrollHeight;
  } catch(e) {
    document.getElementById('chatBox').innerHTML = '<div class="empty">Errore nel caricamento.</div>';
  }
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function escAttr(s) {
  return String(s).replace(/'/g, "\\'");
}

loadClienti();
setInterval(loadClienti, 30000);
</script>
</body>
</html>`;
