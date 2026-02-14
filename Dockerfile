FROM node:20-bookworm-slim

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV LIBREOFFICE_PATH=/usr/bin/soffice
ENV CHROMIUM_PATH=/usr/bin/chromium

RUN apt-get update && apt-get install -y --no-install-recommends \
  libreoffice \
  libreoffice-writer \
  poppler-utils \
  chromium \
  fonts-noto-core \
  fonts-noto-cjk \
  fonts-liberation \
  ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
