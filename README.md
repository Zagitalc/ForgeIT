# ForgeIT

ForgeIT is a local-first converter/PDF toolkit built with Next.js, Tailwind, and TypeScript.

## 🟢 Quick Start for Mac Users (No Coding Required!)

If you just want to use this app privately on your computer to compress or edit PDFs without your data ever going to the internet, follow these steps.

Because this app runs 100% offline on your machine, it needs a helper program called Docker to set up the environment safely.

**Step 1: Install Docker**
1. Go to [Docker's website](https://www.docker.com/products/docker-desktop/) and download **Docker Desktop for Mac**.
2. Install it like a normal Mac app (drag it to your Applications folder) and open it.
3. It might ask you to sign up, but you can usually just skip that and proceed to the main dashboard. Leave the Docker app running in the background.

**Step 2: Download This App**
1. At the top of this GitHub page, click the green **"<> Code"** button.
2. Click **"Download ZIP"**.
3. Unzip the folder and place it somewhere easy to find, like your Desktop.

**Step 3: Start the App**
1. Open the **Terminal** app on your Mac (Press `Cmd + Space`, type "Terminal", and hit Enter).
2. Type `cd ` (make sure to include the space after `cd`).
3. Drag and drop the unzipped ForgeIT folder from your Desktop directly into the Terminal window. It will fill in the folder's path for you. Press **Enter**.
4. Type this exact command and press **Enter**: `docker compose up --build`
5. The Terminal will start downloading the necessary files. This might take a few minutes the first time. Wait until the text stops moving and you see a message saying the app is running.

**Step 4: Compress Your PDFs!**
1. Open your web browser (Safari, Chrome, etc.).
2. Go to: **http://localhost:3000**
3. You can now safely compress and edit your PDFs. Your files never leave your computer.

*Note: When you are completely done using the app, you can go back to the Terminal window and press `Control + C` to shut it down.*

### Optional: Make launching easier next time

After the first setup, you don't need to repeat Steps 1-4 every time. Instead:

1. In the unzipped ForgeIT folder, find the file called **`start-forgeit.command`**.
2. Double-click it. It will open Terminal and start the app automatically.
3. Wait about 30 seconds, then go to **http://localhost:3000** as usual.

> If your Mac warns you that the file can't be opened because it's from an unidentified developer, go to **System Settings -> Privacy & Security** and click **"Open Anyway"**.

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
