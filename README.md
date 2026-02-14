# ForgeIT

ForgeIT is a local-first file converter and PDF toolkit built with Next.js, Tailwind, and TypeScript.

## Features in v1

- Word (`.docx`) -> PDF via LibreOffice headless
- HTML -> PDF via Chromium
- Markdown -> Word (`.docx`)
- PDF merge, split, rotate, page numbering, PDF -> images
- Image resize/compress/format conversion, images -> PDF
- Batch output as ZIP with naming patterns
- Metadata-only job history

## Explicitly Out of Scope in v1

- Markdown -> PDF
- Cloud API conversion
- Excel/PowerPoint conversion
- Host filesystem move/rename actions

## Architecture

- Next.js App Router + Node runtime API routes
- Queue-based async job processing
- Global concurrent jobs: `2`
- LibreOffice conversion mutex: `1`
- Temp storage under `/tmp/forgeit`
- Metadata store at `.forgeit/jobs.json`

## API

- `POST /api/jobs` enqueue job
- `GET /api/jobs` list jobs + queue stats
- `GET /api/jobs/:id` get job status
- `GET /api/jobs/:id/download` download ZIP output
- `GET /api/health` dependency + queue health

## Tool Values

- `word.docx_to_pdf`
- `convert.html_pdf`
- `convert.markdown_docx`
- `pdf.merge`
- `pdf.split`
- `pdf.rotate`
- `pdf.page_numbers`
- `pdf.to_images`
- `image.process`
- `convert.images_pdf`

## Docker-First Setup (Recommended)

```bash
docker compose up --build
```

App runs at [http://localhost:3000](http://localhost:3000).

### Docker includes

- LibreOffice
- Chromium
- Poppler (`pdftoppm`)
- Noto + Liberation fonts

Optional custom fonts can be mounted via `./fonts` (already wired in `docker-compose.yml`).

## Native Setup (Secondary)

Prerequisites:

- Node.js 20.x
- LibreOffice 7+
- Chromium
- Poppler (`pdftoppm`) for PDF -> images

Install and run:

```bash
npm install
npm run verify-deps
npm run dev
```

## Environment Variables

- `LIBREOFFICE_PATH` optional override for `soffice`
- `CHROMIUM_PATH` optional override for chromium executable
- `FORGEIT_TEMP_ROOT` optional temp root (default `/tmp/forgeit`)
- `LIBREOFFICE_TIMEOUT_MS` optional conversion timeout (default `60000`)

## Limits and Safety Defaults

- Max files per job: `20`
- Max file size: `50MB`
- Max total upload per job: `200MB`
- Queue full returns HTTP `429`

Security defaults:

- MIME and extension checks
- Filename sanitization
- Path traversal protection
- No outbound conversion API calls

## Cleanup Lifecycle

- Inputs/processing artifacts removed immediately on success
- Output ZIP expires after 30 minutes
- Failed job artifacts expire after 1 hour
- Sweeper runs every 15 minutes
- Startup sweep removes stale temp data older than 24 hours

## PWA Offline Scope

- Installable shell and cached assets are available offline
- New conversion jobs still require local server runtime and dependencies

## Troubleshooting

### LibreOffice missing

- Install LibreOffice and run `npm run verify-deps`
- Set `LIBREOFFICE_PATH` if not on PATH

### HTML -> PDF fails

- Install Chromium and set `CHROMIUM_PATH`

### PDF -> images fails

- Install Poppler (`pdftoppm`)

### Layout differences in Word -> PDF

- Install source fonts used by the document
- Use mounted `./fonts` directory in Docker for custom fonts

## Tests

```bash
npm test
```

Includes unit and integration coverage for validators, naming, PDF range parser, and queue behavior.
