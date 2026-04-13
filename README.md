# ToolHub

ToolHub is a lightweight, modular online tools starter built with Next.js App Router + TypeScript and optimized for Vercel Hobby.

## 1) Folder structure

```txt
app/
  api/
    compress/route.ts
    convert/route.ts
    remove-bg/route.ts
  tools/
    bg-remover/page.tsx
    compressor/page.tsx
    converter/page.tsx
  globals.css
  layout.tsx
  page.tsx
components/
  FileDropzone.tsx
  ResultPanel.tsx
  ToolCard.tsx
lib/
  format.ts
  validation.ts
tools/
  modules/
    bgRemover.ts
    compressor.ts
    converter.ts
  providers/
    backgroundRemoval.ts
    compression.ts
    converter.ts
  registry.ts
types/
  tool.ts
.env.example
README.md
```

## 2) Architecture overview

- **Modular plugin system**
  - Each tool is defined as a module (`tools/modules/*`) with `id`, `name`, `description`, `route`, `icon`, `category`, `supportedFormats`, and `enabled`.
  - A central registry (`tools/registry.ts`) exposes enabled tools for the home dashboard.
- **Provider/adapter pattern**
  - Providers abstract heavy processing and can be swapped using env flags.
  - Implemented interfaces:
    - `ImageConverterProvider` (`tools/providers/converter.ts`)
    - `CompressionProvider` (`tools/providers/compression.ts`)
    - `BackgroundRemovalProvider` (`tools/providers/backgroundRemoval.ts`)
  - Each provider includes:
    - Local MVP implementation (`Local*Provider`)
    - External placeholder (`External*Provider`) for future APIs.
- **Serverless-first**
  - Route handlers in `app/api/*` keep execution short.
  - Enforced size limit (8MB) in `lib/validation.ts`.

## 3) Code (file-by-file key notes)

- `app/api/convert/route.ts`: Conversion API endpoint with provider selection and error handling.
- `app/api/compress/route.ts`: Compression endpoint with `quality` + mode (`image|zip|pdf`).
- `app/api/remove-bg/route.ts`: Background removal endpoint returning transparent PNG.
- `tools/providers/converter.ts`: Image conversion with `sharp`, text/html-to-pdf with `pdf-lib`, plus external adapter placeholder.
- `tools/providers/compression.ts`: Image compression with `sharp`, zip compression with `jszip`, PDF placeholder via external adapter.
- `tools/providers/backgroundRemoval.ts`: Lightweight near-white background remover mock and external adapter placeholder.
- `components/FileDropzone.tsx`: drag-and-drop + click upload.
- `components/ResultPanel.tsx`: before/after size, ratio, provider metadata, download CTA.
- Tool pages (`app/tools/*/page.tsx`): mobile-first workflows with loading and error states.

## 4) Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## 5) .env.example

See `.env.example` for provider switch flags and external API placeholders.

## 6) Vercel deployment guide (Hobby)

1. Push this repo to GitHub.
2. Import project in Vercel.
3. Framework preset: **Next.js**.
4. Add environment variables from `.env.example`.
5. Deploy.

Vercel optimization notes:
- Keep files <= 8MB in MVP.
- Avoid long-running processing in route handlers.
- Route handlers use Node runtime only when needed.
- Heavy operations are abstracted behind external providers.

## 7) How to add a new tool

1. Add a module definition in `tools/modules/newTool.ts`.
2. Register it in `tools/registry.ts`.
3. Add UI page at `app/tools/new-tool/page.tsx`.
4. Add route handler(s) under `app/api/...`.
5. Create/extend provider interface under `tools/providers/`.
6. Document format support and limitations in README.

## 8) Notes on format support & limitations

### File Converter
- **Implemented locally**:
  - Images: JPG/JPEG/PNG/WEBP (using `sharp`)
  - TXT -> PDF (using `pdf-lib`)
  - HTML -> PDF (plain-text extraction MVP)
- **Scaffolded via provider abstraction**:
  - PDF -> TXT robust extraction
  - DOCX/PPTX, audio/video conversion
  - Advanced GIF/SVG transformations

### File Compressor
- **Implemented locally**:
  - JPG/PNG/WEBP with quality slider
  - ZIP compression
- **Scaffolded**:
  - PDF compression (external provider)

### Background Remover
- **Implemented locally (MVP mock)**:
  - Near-white background -> transparent PNG
- **Scaffolded**:
  - Production-grade AI segmentation via external provider.

## Roadmap

- **PDF tools**: merge/split using `pdf-lib` plus page-level previews.
- **Image resizer**: add width/height presets and keep aspect-ratio lock.
- **OCR**: external OCR API adapter (avoid heavy OCR runtime on Hobby tier).
- **Video tools**: external API/worker adapter with async job polling.

