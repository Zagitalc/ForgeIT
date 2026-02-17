FROM node:20-bookworm-slim

ENV NEXT_TELEMETRY_DISABLED=1
ENV LIBREOFFICE_PATH=/usr/bin/soffice
ENV CHROMIUM_PATH=/usr/bin/chromium
ENV QPDF_PATH=/usr/bin/qpdf

RUN apt-get update && apt-get install -y --no-install-recommends \
  libreoffice \
  libreoffice-writer \
  poppler-utils \
  qpdf \
  chromium \
  fonts-noto-core \
  fonts-noto-cjk \
  fonts-liberation \
  ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build
RUN npm prune --omit=dev

ENV NODE_ENV=production

EXPOSE 3000

CMD ["npm", "run", "start"]
