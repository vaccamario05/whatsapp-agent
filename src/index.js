import 'dotenv/config';
import express from 'express';
import { initWhatsApp } from './whatsapp.js';
import { dashboardRouter } from './dashboard.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (_req, res) => res.send('mario-agent ok'));
app.use('/crm', dashboardRouter);

app.listen(PORT, () => {
  console.log(`mario-agent in ascolto su http://localhost:${PORT}`);
});

initWhatsApp();
