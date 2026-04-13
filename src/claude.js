import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT } from './prompt.js';
import { saveMessage, getOrCreateCliente, updateCliente } from './db.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const conversations = new Map();

export async function processMessage(from, userMessage) {
  await getOrCreateCliente(from);

  await saveMessage(from, 'user', userMessage);

  if (!conversations.has(from)) {
    conversations.set(from, []);
  }

  const history = conversations.get(from);
  history.push({ role: 'user', content: userMessage });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: history,
  });

  const assistantMessage = response.content[0].text;
  console.log('[claude] Risposta:', assistantMessage);

  await saveMessage(from, 'assistant', assistantMessage);

  history.push({ role: 'assistant', content: assistantMessage });

  // ── STEP 1 & 2: estrazione dati strutturati ──────────────────
  let datiEstratti = null;
  try {
    const extractionResponse = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      messages: [
        ...history,
        {
          role: 'user',
          content:
            'Analizza questa conversazione e estrai i dati disponibili in JSON.\n' +
            'Rispondi SOLO con il JSON, nessun altro testo.\n' +
            'Formato:\n' +
            '{\n' +
            '  "nome": string o null,\n' +
            '  "email": string o null,\n' +
            '  "dataEvento": string o null,\n' +
            '  "location": string o null,\n' +
            '  "servizi": string o null,\n' +
            '  "budget": string o null,\n' +
            '  "cliente_interessato": boolean\n' +
            '}\n' +
            'cliente_interessato deve essere true se il cliente ha espresso interesse concreto ' +
            '(ha chiesto prezzi, ha una data in mente, vuole prenotare, ha chiesto disponibilità). ' +
            'Non è necessario che abbia fornito tutti i dati.',
        },
      ],
    });

    const testo = extractionResponse.content[0].text
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();
    datiEstratti = JSON.parse(testo);
    console.log('[debug] dati estratti:', JSON.stringify(datiEstratti));

    const campi = {};
    if (datiEstratti.nome)       campi['Nome']         = datiEstratti.nome;
    if (datiEstratti.dataEvento) {
      // Prova prima il parse diretto (funziona con 2025-07-12)
      let d = new Date(datiEstratti.dataEvento);

      // Se fallisce, converti mesi italiani in inglese
      if (isNaN(d)) {
        const mesi = {
          'gennaio':'January','febbraio':'February','marzo':'March',
          'aprile':'April','maggio':'May','giugno':'June',
          'luglio':'July','agosto':'August','settembre':'September',
          'ottobre':'October','novembre':'November','dicembre':'December'
        };
        let dataEn = datiEstratti.dataEvento.toLowerCase();
        for (const [it, en] of Object.entries(mesi)) {
          dataEn = dataEn.replace(it, en);
        }
        d = new Date(dataEn);
      }

      if (!isNaN(d)) {
        campi['Data evento'] = d.toISOString().split('T')[0];
      }
    }
    if (datiEstratti.email)    campi['Email']    = datiEstratti.email;
    if (datiEstratti.location) campi['Note']     = `Location: ${datiEstratti.location}`;
    if (datiEstratti.servizi)  campi['Servizio'] = datiEstratti.servizi;
    if (datiEstratti.budget)   campi['Budget']   = datiEstratti.budget;

    if (Object.keys(campi).length > 0) {
      console.log('[debug] campi da salvare:', JSON.stringify(campi));
      updateCliente(from, campi);
    }

    // ── STEP 3: segna il cliente come "Da richiamare" se interessato ──
    if (datiEstratti.cliente_interessato) {
      const cliente = getOrCreateCliente(from);
      if (cliente?.stato === 'Nuovo') {
        updateCliente(from, { Stato: 'Da richiamare' });
        console.log('[debug] cliente marcato Da richiamare:', from);
        return { risposta: assistantMessage, notificaOwner: true, clienteTelefono: from, clienteNome: datiEstratti.nome || null };
      }
    }
  } catch (err) {
    console.error('[claude] Errore estrazione dati:', err.message);
  }

  return { risposta: assistantMessage, notificaOwner: false };
}
