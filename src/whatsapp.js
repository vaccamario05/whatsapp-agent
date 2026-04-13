import pkg from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { rmSync, existsSync } from 'fs';
import { processMessage } from './claude.js';

const { Client, LocalAuth } = pkg;

function clearSingletonLock() {
  for (const f of [
    './auth_whatsapp/session/SingletonLock',
    './auth_whatsapp/session/SingletonCookie',
    './auth_whatsapp/session/SingletonSocket',
  ]) {
    if (existsSync(f)) try { rmSync(f); } catch {}
  }
}

const puppeteerConfig = {
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-extensions',
    '--disable-background-networking',
    '--no-first-run',
    '--disable-features=TranslateUI',
  ],
};
if (process.env.PUPPETEER_EXECUTABLE_PATH) {
  puppeteerConfig.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
}

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './auth_whatsapp' }),
  puppeteer: puppeteerConfig,
});

client.on('qr', (qr) => {
  console.log('[whatsapp] Scansiona il QR (Impostazioni → Dispositivi collegati):');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('[whatsapp] Connesso a WhatsApp');
});

client.on('auth_failure', () => {
  console.error('[whatsapp] Autenticazione fallita — riavvio');
  process.exit(1);
});

client.on('disconnected', (reason) => {
  console.log('[whatsapp] Disconnesso:', reason, '— riavvio tra 30s');
  setTimeout(() => process.exit(1), 30000);
});

client.on('message', async (msg) => {
  if (msg.from.endsWith('@g.us')) return;
  if (msg.from === 'status@broadcast') return;
  if (Date.now() - Number(msg.timestamp) * 1000 > 60000) return;
  if (!msg.body?.trim()) return;
  console.log('[whatsapp] Messaggio da:', msg.from);

  try {
    const contact = await msg.getContact();
    const from = contact.number || msg.from.replace('@c.us', '').replace('@lid', '');
    const risultato = await processMessage(from, msg.body);
    await msg.reply(risultato.risposta);

    console.log('[debug] notificaOwner:', risultato.notificaOwner, '| OWNER_PHONE:', !!process.env.OWNER_PHONE);
    if (risultato.notificaOwner && process.env.OWNER_PHONE) {
      const ownerWid = process.env.OWNER_PHONE.replace(/\D/g, '') + '@c.us';
      const nome = risultato.clienteNome ? ` (${risultato.clienteNome})` : '';
      const crmUrl = process.env.CRM_URL || '';
      const notifica =
        `Nuovo lead interessato${nome}!\n` +
        `Telefono: +${from}\n\n` +
        `Il cliente ha mostrato interesse concreto. Richiamalo appena puoi.` +
        (crmUrl ? `\nCRM: ${crmUrl}` : '');
      try {
        await client.sendMessage(ownerWid, notifica);
        console.log('[whatsapp] Notifica owner inviata');
      } catch (e) {
        console.error('[whatsapp] Errore notifica owner:', e.message);
      }
    }
  } catch (err) {
    console.error(`[whatsapp] Errore da ${msg.from}:`, err.message);
  }
});

export async function initWhatsApp() {
  clearSingletonLock();
  await client.initialize();
}

export async function sendMessage(to, body) {
  try {
    await client.sendMessage(to, body);
  } catch (err) {
    console.error(`[whatsapp] Errore sendMessage a ${to}:`, err.message);
  }
}
