import pkg from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { processMessage } from './claude.js';

const { Client, LocalAuth } = pkg;

const puppeteerConfig = {
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
};
if (process.env.PUPPETEER_EXECUTABLE_PATH) {
  puppeteerConfig.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
}

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './auth_whatsapp' }),
  puppeteer: puppeteerConfig,
});

let qrCount = 0;
client.on('qr', (qr) => {
  qrCount++;
  if (qrCount === 1) {
    console.log('[whatsapp] Scansiona questo QR con WhatsApp (Impostazioni → Dispositivi collegati):');
    qrcode.generate(qr, { small: true });
  } else {
    console.log(`[whatsapp] QR aggiornato (n.${qrCount}) — scansiona velocemente dal telefono.`);
    qrcode.generate(qr, { small: true });
  }
});

client.on('ready', () => {
  console.log('[whatsapp] Connesso a WhatsApp');
});

client.on('auth_failure', (msg) => {
  console.error('[whatsapp] Autenticazione fallita:', msg);
});

client.on('disconnected', (reason) => {
  console.log('[whatsapp] Disconnesso:', reason);
  setTimeout(() => client.initialize(), 5000);
});

client.on('message_create', async (msg) => {
  if (msg.fromMe) return;
  if (msg.from.endsWith('@g.us')) return;
  if (msg.from === 'status@broadcast') return;

  const msgTimestamp = Number(msg.timestamp) * 1000;
  if (Date.now() - msgTimestamp > 60000) return;
  if (!msg.body || !msg.body.trim()) return;

  try {
    const contact = await msg.getContact();
    const from = contact.number || msg.from.replace('@c.us', '').replace('@lid', '');

    const risposta = await processMessage(from, msg.body);
    await msg.reply(risposta);
  } catch (err) {
    console.error(`[whatsapp] Errore elaborazione da ${msg.from}:`, err.message);
  }
});

export async function initWhatsApp() {
  await client.initialize();
}

export async function sendMessage(to, body) {
  try {
    await client.sendMessage(to, body);
  } catch (err) {
    console.error(`[whatsapp] Errore sendMessage a ${to}:`, err.message);
  }
}
