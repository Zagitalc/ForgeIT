# ForgeIT

ForgeIT is a local-first converter/PDF toolkit built with Next.js, Tailwind, and TypeScript.

## What v2 includes

- Word (`.docx`) -> PDF via LibreOffice headless
- HTML -> PDF via Chromium (Playwright core)
- Markdown -> DOCX
- PDF tools: merge, split, rotate, page numbers, PDF -> images
- PDF tools: merge, compress, split, rotate, page numbers, PDF -> images
- Image tools: resize/compress/format conversion, images -> PDF
- Smart output sorting before packaging:
  - by `name`, `date`, or `filename_date`
  - `asc` / `desc`
  - smart filename date parsing supports numeric and text-month formats (for example `DD-MMM-YY`)
- Smart download behavior:
  - single output -> direct file download
  - multiple outputs -> ZIP
- Metadata-only history with re-run/reuse/delete actions
- Mobile-first app shell + light/dark Forge theme

## Out of scope

- Markdown -> PDF
- Cloud/API conversion services
- Excel/PowerPoint conversion
- Host filesystem organizer/DMS behavior

## Runtime architecture

- Next.js App Router + Node runtime API routes
- Queue-based async processing
- Global concurrent jobs: `2`
- Word conversion mutex: `1`
- Temp storage: `/tmp/forgeit`
- Metadata store: `.forgeit/jobs.json`

## API routes

- `POST /api/jobs` enqueue a job
- `GET /api/jobs` list jobs + queue stats + limits
- `GET /api/jobs/:id` get single job status
- `GET /api/jobs/:id/download` download output (direct file or ZIP)
- `POST /api/jobs/:id/rerun` re-run if source still available
- `GET /api/jobs/:id/prefill` load previous options for reuse
- `DELETE /api/jobs/:id` delete metadata/artifacts
- `GET /api/health` dependency + queue health

## Tool IDs

- `word.docx_to_pdf`
- `convert.html_pdf`
- `convert.markdown_docx`
- `pdf.merge`
- `pdf.compress`
- `pdf.split`
- `pdf.rotate`
- `pdf.page_numbers`
- `pdf.to_images`
- `image.process`
- `convert.images_pdf`

## Setup

### Docker-first (recommended)

```bash
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000).

Docker image includes:
- LibreOffice
- Chromium
- Poppler (`pdftoppm`)
- qpdf (used for reliable PDF merge, especially bank statements)
- Noto + Liberation fonts

### Native setup

Prerequisites:
- Node.js 20.x
- LibreOffice 7+
- Chromium
- Poppler (`pdftoppm`)
- qpdf (recommended/required for robust PDF merge compatibility)

Install and run:

```bash
npm install
npm run verify-deps
npm run dev
```

## Environment variables

- `LIBREOFFICE_PATH`: optional `soffice` override
- `CHROMIUM_PATH`: optional Chromium executable override
- `FORGEIT_TEMP_ROOT`: optional temp root (default `/tmp/forgeit`)
- `LIBREOFFICE_TIMEOUT_MS`: Word conversion timeout (default `60000`)

## Limits and safety defaults

- Max files/job: `30`
- Max file size: `50MB`
- Max total/job: `200MB`
- Queue full: HTTP `429`

Security defaults:
- MIME + extension validation
- Filename sanitization
- Path traversal protection
- No outbound conversion API calls

## Cleanup lifecycle

- Inputs/processing removed after success
- Output artifacts expire after 30 minutes
- Failed artifacts expire after 1 hour
- Sweeper runs every 15 minutes
- Startup sweep removes stale temp data older than 24 hours

## PWA/offline scope

- App shell and cached assets are available offline
- New conversion jobs still require local server runtime and dependencies

## Troubleshooting

### PDF merge succeeds but output is blank/corrupt (bank statements)

Cause:
- Some protected PDFs merge poorly with pure JS engines.

Fix:
- Ensure `qpdf` is installed and available on PATH.
- Re-run merge (new output will be generated through qpdf-first path).

### LibreOffice missing

- Install LibreOffice
- Run `npm run verify-deps`
- Set `LIBREOFFICE_PATH` if needed

### HTML -> PDF fails

- Install Chromium
- Set `CHROMIUM_PATH` if needed

### PDF -> images fails

- Install Poppler (`pdftoppm`)

### Word layout mismatch

- Install source fonts used by the document
- In Docker, mount custom fonts under `./fonts`

## Tests

Run all tests:

```bash
npm test
```

Run coverage:

```bash
npm run test:coverage
```

Includes unit/integration coverage for sorting, validators, queue behavior, download routing, processor flows, and PDF operation paths.
