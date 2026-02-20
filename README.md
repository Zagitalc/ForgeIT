# ForgeIT

ForgeIT is a local-first converter/PDF toolkit built with Next.js, Tailwind, and TypeScript. Your files never leave your computer.

## 🟢 Quick Start for Mac Users (No Coding Required!)

If you want to use this app privately to compress or edit PDFs without your data ever going to the internet, follow these steps. The app runs 100% on your own machine.

**Step 1: Install Docker**
1. Go to [Docker's website](https://www.docker.com/products/docker-desktop/) and download **Docker Desktop for Mac**.
2. Install it like a normal Mac app (drag it to your Applications folder) and open it.
3. It might ask you to sign up — you can skip that and go straight to the dashboard. Leave Docker running in the background.

**Step 2: Start the App**
1. Open the **Terminal** app on your Mac (Press `Cmd + Space`, type "Terminal", hit Enter).
2. Copy and paste this command, then press **Enter**:
   ```
   docker run -p 3000:3000 zach1328/forgeit:latest
   ```
3. Wait about 30–60 seconds while it downloads and starts. When the text stops moving and you see a message that the app is running, you're ready.

**Step 3: Compress Your PDFs!**
1. Open your web browser (Safari, Chrome, etc.).
2. Go to: **http://localhost:3000**
3. Use the app to compress, merge, split, or edit your PDFs. Your files never leave your computer.

*When you're done, go back to the Terminal window and press `Control + C` to shut it down.*

**Every time after that**, just open Docker Desktop and run the same `docker run` command from Step 2. No downloading or building needed.

---

## What v2 includes

- Word (`.docx`) → PDF via LibreOffice headless
- HTML → PDF via Chromium (Playwright core)
- Markdown → DOCX
- PDF tools: merge, compress, split, rotate, page numbers, PDF → images
- Image tools: resize/compress/format conversion, images → PDF
- Smart output sorting: by name, date, or filename date (asc/desc)
- Smart download: single file downloads directly, multiple files as ZIP
- Metadata-only history with re-run/reuse/delete actions
- Mobile-first app shell + light/dark Forge theme

## Out of scope

- Markdown → PDF
- Cloud/API conversion services
- Excel/PowerPoint conversion

## For Developers

### Run from Docker Hub

```bash
docker run -p 3000:3000 zach1328/forgeit:latest
```

### Build and run locally

```bash
docker compose up --build
```

Docker image includes: LibreOffice, Chromium, Poppler (`pdftoppm`), qpdf, Noto + Liberation fonts.

### Native setup

Prerequisites: Node.js 20.x, LibreOffice 7+, Chromium, Poppler, qpdf

```bash
npm install
npm run verify-deps
npm run dev
```

## Runtime architecture

- Next.js App Router + Node runtime API routes
- Queue-based async processing (2 concurrent jobs, 1 Word conversion mutex)
- Temp storage: `/tmp/forgeit` — Metadata store: `.forgeit/jobs.json`

## API routes

- `POST /api/jobs` — enqueue a job
- `GET /api/jobs` — list jobs + queue stats
- `GET /api/jobs/:id` — get job status
- `GET /api/jobs/:id/download` — download output
- `POST /api/jobs/:id/rerun` — re-run a job
- `GET /api/jobs/:id/prefill` — reload previous options
- `DELETE /api/jobs/:id` — delete job metadata/artifacts
- `GET /api/health` — dependency + queue health

## Limits

- Max files/job: `50`
- Max file size: `150MB`
- Max total/job: `500MB`

## Security defaults

- MIME + extension validation
- Filename sanitization
- Path traversal protection
- No outbound conversion API calls

## Cleanup lifecycle

- Inputs removed after successful processing
- Output artifacts expire after 30 minutes
- Failed artifacts expire after 1 hour
- Sweeper runs every 15 minutes
- Startup sweep clears stale data older than 24 hours

## Troubleshooting

**PDF merge output is blank or corrupt (bank statements)**
Some protected PDFs merge poorly with pure JS engines. Ensure `qpdf` is installed and re-run the merge.

**LibreOffice missing** — Install LibreOffice, run `npm run verify-deps`, set `LIBREOFFICE_PATH` if needed.

**HTML → PDF fails** — Install Chromium, set `CHROMIUM_PATH` if needed.

**PDF → images fails** — Install Poppler (`pdftoppm`).

**Word layout mismatch** — Install the fonts used by the document. In Docker, mount custom fonts under `./fonts`.

## Tests

```bash
npm test
npm run test:coverage
```

## Environment variables

- `LIBREOFFICE_PATH` — optional soffice override
- `CHROMIUM_PATH` — optional Chromium executable override
- `FORGEIT_TEMP_ROOT` — optional temp root (default `/tmp/forgeit`)
- `LIBREOFFICE_TIMEOUT_MS` — Word conversion timeout (default `60000`)

## License

MIT
