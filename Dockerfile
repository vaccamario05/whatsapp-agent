FROM node:20-slim

RUN apt-get update && apt-get install -y \
    chromium \
    fonts-freefont-ttf \
    ca-certificates \
    python3 \
    make \
    g++ \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src/ ./src/

# config.json e .env sono montati come volumi a runtime (via compose.yml)
CMD ["sh", "-c", "rm -f /app/auth_whatsapp/session/Singleton* 2>/dev/null; node src/index.js"]
