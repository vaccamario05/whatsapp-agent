#!/usr/bin/env node
import readline from 'readline';
import { writeFileSync, readFileSync, existsSync } from 'fs';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const ask = (question, defaultVal) => new Promise(resolve => {
  const hint = defaultVal !== undefined ? ` [${defaultVal || 'invio per saltare'}]` : '';
  rl.question(`${question}${hint}: `, answer => {
    const val = answer.trim();
    resolve(val !== '' ? val : (defaultVal ?? ''));
  });
});

const askYN = async (question, defaultVal = true) => {
  const hint = defaultVal ? 's/n' : 's/n';
  const def = defaultVal ? 's' : 'n';
  const answer = await ask(`${question} (s/n)`, def);
  return answer.toLowerCase().startsWith('s');
};

const separator = (title) => {
  console.log(`\n${'─'.repeat(50)}`);
  if (title) console.log(`  ${title}`);
  console.log('─'.repeat(50));
};

// ── Carica config esistente se presente ──────────────
let existing = {};
if (existsSync('./config.json')) {
  try {
    existing = JSON.parse(readFileSync('./config.json', 'utf8'));
    console.log('\n✓ Configurazione esistente trovata. Premi Invio per mantenere i valori attuali.\n');
  } catch {
    console.log('\nConfig esistente non leggibile, si riparte da zero.\n');
  }
}

// ── Carica .env esistente ─────────────────────────────
let existingEnv = {};
if (existsSync('./.env')) {
  try {
    readFileSync('./.env', 'utf8').split('\n').forEach(line => {
      const [k, ...v] = line.split('=');
      if (k && v.length) existingEnv[k.trim()] = v.join('=').trim();
    });
  } catch {}
}

console.log('\n╔══════════════════════════════════════════════╗');
console.log('║      WHATSAPP AI AGENT — SETUP GUIDATO       ║');
console.log('╚══════════════════════════════════════════════╝\n');

// ── SEZIONE 1: Identità ───────────────────────────────
separator('1 / 5  IDENTITÀ');

const nome = await ask('Il tuo nome completo (es. Mario Rossi)', existing.nome);
const professione = await ask('La tua professione/settore (es. videomaker, fotografo, consulente)', existing.professione);
const descrizione = await ask('Descrizione breve di ciò che fai (1-2 frasi)', existing.descrizione);
const zona = await ask('Zona geografica principale (es. Campania, Milano e provincia)', existing.zona);

// ── SEZIONE 2: Servizi ────────────────────────────────
separator('2 / 5  SERVIZI E PREZZI');

let servizi = existing.servizi ? [...existing.servizi] : [];

if (servizi.length > 0) {
  console.log('\nServizi attuali:');
  servizi.forEach((s, i) => console.log(`  ${i + 1}. ${s.nome} — ${s.prezzo}`));
  const reset = await askYN('Vuoi resettare e reinserire tutti i servizi?', false);
  if (reset) servizi = [];
}

if (servizi.length === 0) {
  console.log('\nAggiungi i tuoi servizi uno per uno.');
}

let aggiungi = servizi.length === 0 ? true : await askYN('Vuoi aggiungere un nuovo servizio?', false);

while (aggiungi) {
  console.log('');
  const nomeServizio = await ask('  Nome del servizio');
  if (!nomeServizio) break;
  const descServizio = await ask('  Descrizione breve');
  const prezzoServizio = await ask('  Prezzo (es. "a partire da €500" oppure "preventivo su richiesta")');
  servizi.push({ nome: nomeServizio, descrizione: descServizio, prezzo: prezzoServizio });
  console.log(`  ✓ Servizio "${nomeServizio}" aggiunto.`);
  aggiungi = await askYN('Aggiungere un altro servizio?', false);
}

// ── SEZIONE 3: Tono ───────────────────────────────────
separator('3 / 5  TONO DI COMUNICAZIONE');

const toniMap = { '1': 'professionale_caldo', '2': 'formale', '3': 'informale' };
const toniLabel = { 'professionale_caldo': '1', 'formale': '2', 'informale': '3' };
console.log('  [1] Professionale e caldo — cordiale ma serio (consigliato)');
console.log('  [2] Formale — distaccato e preciso');
console.log('  [3] Informale e diretto — colloquiale');
const toneDefault = toniLabel[existing.tono] || '1';
const toneInput = await ask('Scegli il tono', toneDefault);
const tono = toniMap[toneInput] || 'professionale_caldo';

// ── SEZIONE 4: Operativo ──────────────────────────────
separator('4 / 5  INFO OPERATIVE');

const pagamento = await ask('Modalità di pagamento (es. "bonifico, acconto alla firma")', existing.pagamento);
const contratto = await askYN('Lavori sempre con contratto?', existing.contratto ?? true);
const lingue = await ask('Lingue parlate (es. italiano, inglese)', existing.lingue || 'italiano');

// ── SEZIONE 5: Configurazione tecnica ────────────────
separator('5 / 5  CONFIGURAZIONE TECNICA');

const apiKey = await ask('API key di Anthropic Claude (sk-ant-...)', existingEnv.ANTHROPIC_API_KEY || '');
const crmPassword = await ask('Password per la dashboard CRM', existingEnv.CRM_PASSWORD || '');
const porta = await ask('Porta del server', existingEnv.PORT || '3000');

// ── Salvataggio ───────────────────────────────────────
separator();

const config = { nome, professione, descrizione, zona, servizi, tono, pagamento, contratto, lingue };
writeFileSync('./config.json', JSON.stringify(config, null, 2));

const envContent = [
  `ANTHROPIC_API_KEY=${apiKey}`,
  `PORT=${porta}`,
  crmPassword ? `CRM_PASSWORD=${crmPassword}` : '',
].filter(Boolean).join('\n') + '\n';
writeFileSync('./.env', envContent);

console.log('\n✓ config.json salvato');
console.log('✓ .env salvato');
console.log('\n┌──────────────────────────────────────────────┐');
console.log('│  Setup completato! Prossimi passi:           │');
console.log('│                                              │');
console.log('│  1. docker compose up -d                     │');
console.log('│  2. docker logs -f whatsapp-agent            │');
console.log('│     (scansiona il QR con WhatsApp)           │');
console.log('│  3. Apri http://IP-SERVER/crm                │');
console.log('└──────────────────────────────────────────────┘\n');

rl.close();
