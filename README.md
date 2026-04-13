# WhatsApp AI Agent

Agente WhatsApp basato su Claude (Anthropic) per gestire le prime richieste dei clienti in modo automatico. Qualifica i lead, raccoglie le informazioni essenziali e avvisa il titolare quando un cliente è pronto per essere ricontattato. Include una dashboard CRM per visualizzare clienti e conversazioni.

## Requisiti

- [Node.js](https://nodejs.org/) 20+
- [Docker](https://www.docker.com/) + Docker Compose
- Un account [Anthropic](https://console.anthropic.com/) con API key
- Un telefono con WhatsApp attivo

## Installazione

### 1. Clona il repository

```bash
git clone https://github.com/TUO-USERNAME/whatsapp-agent
cd whatsapp-agent
```

### 2. Esegui il setup guidato

```bash
node setup.js
```

Il wizard ti chiederà:
- Il tuo nome e professione
- I servizi che offri (con prezzi)
- Il tono di comunicazione
- La tua API key di Anthropic Claude
- Nome utente e password per proteggere la dashboard CRM

Al termine vengono generati automaticamente `config.json` e `.env`.

### 3. Avvia il server

```bash
docker compose up -d
```

### 4. Connetti WhatsApp

```bash
docker logs -f whatsapp-agent
```

Appare un QR code nel terminale. Aprilo con WhatsApp sul telefono:
**Impostazioni → Dispositivi collegati → Collega un dispositivo**

Quando vedi `[whatsapp] Connesso a WhatsApp` sei operativo.

### 5. Apri la dashboard CRM

```
http://IP-DEL-SERVER/crm
```

Inserisci nome utente e password scelti durante il setup.

> **Consiglio:** esponi la dashboard solo via Tailscale (VPN) e usa HTTPS per evitare che le credenziali viaggino in chiaro.

---

## Aggiornare la configurazione

Per modificare nome, servizi, prezzi o tono in qualsiasi momento:

```bash
node setup.js
docker compose restart
```

---

## Comandi utili

```bash
# Avvia
docker compose up -d

# Ferma
docker compose down

# Log in tempo reale
docker logs -f whatsapp-agent

# Riavvia dopo modifiche
docker compose restart

# Aggiorna l'immagine dopo modifiche al codice
docker compose build && docker compose up -d
```

---

## Struttura

```
whatsapp-agent/
├── setup.js          # Wizard di configurazione
├── src/
│   ├── index.js      # Server Express
│   ├── whatsapp.js   # Client WhatsApp
│   ├── claude.js     # Logica AI (Anthropic)
│   ├── db.js         # Database SQLite
│   ├── dashboard.js  # Dashboard CRM web
│   └── prompt.js     # Genera il prompt AI da config.json
├── config.json       # La tua configurazione (non committato)
├── .env              # API key e password (non committato)
├── Dockerfile
└── compose.yml
```

---

## Come funziona

1. Il cliente scrive su WhatsApp
2. L'AI risponde qualificando la richiesta in base alla tua configurazione
3. Quando il cliente mostra interesse concreto, l'AI dice che lo ricontatterai personalmente
4. Il cliente viene salvato nel database con stato `Da richiamare`
5. Dalla dashboard CRM vedi tutti i clienti e le conversazioni

---

## Sicurezza

- La dashboard è protetta da nome utente e password (HTTP Basic Auth)
- `config.json` e `.env` sono esclusi dal repository (`.gitignore`)
- Il database locale non viene mai caricato su servizi esterni
- Consigliato: accesso alla dashboard solo via VPN (es. Tailscale) con HTTPS
