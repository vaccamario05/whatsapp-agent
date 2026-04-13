import 'dotenv/config';
import express from 'express';
import { initWhatsApp } from './whatsapp.js';
import { dashboardRouter } from './dashboard.js';

// Impedisce al processo di morire per errori non gestiti
process.on('uncaughtException', (err) => {
  console.error('[processo] Errore non gestito:', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('[processo] Promise rifiutata:', reason?.message || reason);
});

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (_req, res) => res.send('mario-agent ok'));
app.use('/crm', dashboardRouter);

app.listen(PORT, () => {
  console.log(`mario-agent in ascolto su http://localhost:${PORT}`);
});

initWhatsApp();
