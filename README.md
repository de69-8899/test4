# ToolHub

ToolHub is a modular all-in-one tools web app starter built for **Next.js App Router + TypeScript** and deployable on **Vercel Hobby**.

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
  ThemeProvider.tsx
  ThemeToggle.tsx
  ToolCard.tsx
lib/
  format.ts
  validation.ts
tools/
  modules/
  providers/
  registry.ts
types/
```

## 2) Architecture explanation

- **Plugin-style tool registry** (`tools/registry.ts`): each tool module defines `id`, `name`, `description`, `route`, `icon`, `category`, `supportedFormats`, `enabled`.
- **Provider/adapter architecture** (`tools/providers/*`):
  - `converter.ts`: local conversions + advanced **CloudConvert** adapter.
  - `compression.ts`: local compression + advanced **TinyPNG** and configurable enterprise PDF API adapter.
  - `backgroundRemoval.ts`: local fallback + advanced **remove.bg** adapter.
- **Provider mode switch** via env: `external | local`.
  - `external` is the default and uses advanced APIs.
- **Shared layers**:
  - UI: dropzone, result panel, theme controls.
  - Utilities: validation + formatting.
  - API routes: lightweight route handlers with provider dispatch.

## 3) Code (file-by-file)

- `app/layout.tsx`: app shell + theme provider + theme mode toggle.
- `components/ThemeProvider.tsx`: system theme detection (`prefers-color-scheme`) + persisted user override.
- `components/ThemeToggle.tsx`: manual `system/light/dark` switch.
- `app/api/convert/route.ts`: conversion endpoint.
- `app/api/compress/route.ts`: compression endpoint.
- `app/api/remove-bg/route.ts`: background remover endpoint.
- `tools/providers/converter.ts`: local + CloudConvert advanced adapter.
- `tools/providers/compression.ts`: local + TinyPNG/advanced PDF API adapter.
- `tools/providers/backgroundRemoval.ts`: local + remove.bg advanced adapter.

## 4) Setup

```bash
npm install
npm run dev
```

## 5) .env.example

See `.env.example` for default external-mode advanced API keys.

## 6) Vercel deployment guide

1. Push repo to GitHub.
2. Import into Vercel.
3. Add env vars from `.env.example`.
4. Deploy.

### Vercel Hobby optimization

- 8MB file cap for MVP route safety.
- Route handlers return quickly and avoid long local CPU tasks.
- Heavy conversions routed to external APIs when configured.

## 7) How to add new tool

1. Add module metadata in `tools/modules/*`.
2. Register in `tools/registry.ts`.
3. Add UI page at `app/tools/<tool>/page.tsx`.
4. Add route handler at `app/api/<tool>/route.ts`.
5. Add provider interface + local/external adapters.

## 8) Format support & limitations

### File Converter
- Local: JPG/JPEG/PNG/WEBP, TXT->PDF, HTML->PDF (text extraction).
- Advanced external: CloudConvert for broader doc/audio/video workflows.
- Still recommended to avoid heavy synchronous video processing in Hobby functions.

### File Compressor
- Local: image quality compression and ZIP creation.
- Advanced external: TinyPNG image compression, configurable enterprise PDF compression endpoint.

### Image Background Remover
- Local fallback: near-white transparency mock.
- Advanced external: remove.bg API (transparent PNG output).

## Roadmap

- PDF tools: merge/split
- Image resizer
- OCR (external API adapter)
- Video tools (external API + async jobs)
