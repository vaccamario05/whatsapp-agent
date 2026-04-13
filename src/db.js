import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, '../mario-agent.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS clienti (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telefono TEXT UNIQUE NOT NULL,
    nome TEXT,
    email TEXT,
    data_evento TEXT,
    location TEXT,
    servizio TEXT,
    budget TEXT,
    stato TEXT DEFAULT 'Nuovo',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS conversazioni (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telefono TEXT NOT NULL,
    ruolo TEXT NOT NULL,
    messaggio TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

export function saveMessage(telefono, ruolo, messaggio) {
  try {
    db.prepare('INSERT INTO conversazioni (telefono, ruolo, messaggio) VALUES (?, ?, ?)')
      .run(telefono, ruolo, messaggio);
  } catch (err) {
    console.error('[db] Errore saveMessage:', err.message);
  }
}

export function getOrCreateCliente(telefono) {
  try {
    let cliente = db.prepare('SELECT * FROM clienti WHERE telefono = ?').get(telefono);
    if (!cliente) {
      db.prepare('INSERT INTO clienti (telefono) VALUES (?)').run(telefono);
      cliente = db.prepare('SELECT * FROM clienti WHERE telefono = ?').get(telefono);
    }
    return cliente;
  } catch (err) {
    console.error('[db] Errore getOrCreateCliente:', err.message);
  }
}

export function updateCliente(telefono, campi) {
  const colonneMap = {
    'Nome': 'nome',
    'Email': 'email',
    'Data evento': 'data_evento',
    'Note': 'location',
    'Servizio': 'servizio',
    'Budget': 'budget',
    'Stato': 'stato',
  };
  try {
    const set = [];
    const values = [];
    for (const [chiave, valore] of Object.entries(campi)) {
      const colonna = colonneMap[chiave];
      if (colonna) { set.push(`${colonna} = ?`); values.push(valore); }
    }
    if (set.length === 0) return;
    values.push(telefono);
    db.prepare(`UPDATE clienti SET ${set.join(', ')} WHERE telefono = ?`).run(...values);
    console.log('[db] updateCliente:', telefono, JSON.stringify(campi));
  } catch (err) {
    console.error('[db] Errore updateCliente:', err.message);
  }
}

export function getAllClienti() {
  return db.prepare('SELECT * FROM clienti ORDER BY created_at DESC').all();
}

export function getConversazioni(telefono) {
  return db.prepare('SELECT * FROM conversazioni WHERE telefono = ? ORDER BY id ASC').all(telefono);
}

export function checkDisponibilita(dataEvento) {
  try {
    const record = db.prepare(
      "SELECT id FROM clienti WHERE data_evento = ? AND stato != 'Perso'"
    ).get(dataEvento);
    console.log('[db] checkDisponibilita per data:', dataEvento, '| occupato:', !!record);
    return !record;
  } catch (err) {
    console.error('[db] Errore checkDisponibilita:', err.message);
    return true;
  }
}
