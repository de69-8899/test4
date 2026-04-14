import sharp from 'sharp';
import JSZip from 'jszip';

export interface CompressInput {
  file: File;
  quality: number;
  mode: 'image' | 'zip' | 'pdf';
}

export interface CompressOutput {
  filename: string;
  mimeType: string;
  data: Buffer;
  provider: string;
  notes?: string;
}

export interface CompressionProvider {
  compress(input: CompressInput): Promise<CompressOutput>;
}

export class LocalCompressionProvider implements CompressionProvider {
  async compress({ file, quality, mode }: CompressInput): Promise<CompressOutput> {
    const sourceBuffer = Buffer.from(await file.arrayBuffer());
    const baseName = file.name.replace(/\.[^.]+$/, '');

    if (mode === 'image') {
      const format = file.type.split('/')[1] ?? 'jpeg';
      const outputFormat = format === 'jpg' ? 'jpeg' : format;
      const data = await sharp(sourceBuffer)
        .toFormat(outputFormat as keyof sharp.FormatEnum, { quality })
        .toBuffer();

      return {
        filename: `${baseName}.compressed.${outputFormat === 'jpeg' ? 'jpg' : outputFormat}`,
        mimeType: `image/${outputFormat}`,
        data,
        provider: 'local-open-source'
      };
    }

    if (mode === 'zip') {
      const zip = new JSZip();
      zip.file(file.name, sourceBuffer);
      const data = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: Math.round((quality / 100) * 9) } });
      return {
        filename: `${baseName}.zip`,
        mimeType: 'application/zip',
        data,
        provider: 'local-open-source'
      };
    }

    throw new Error('PDF compression requires FREE_COMPRESSION_API_URL in external mode.');
  }
}

export class FreeAdvancedCompressionProvider implements CompressionProvider {
  private endpoint = process.env.FREE_COMPRESSION_API_URL;
  private apiKey = process.env.FREE_COMPRESSION_API_KEY;

  async compress({ file, quality, mode }: CompressInput): Promise<CompressOutput> {
    if (!this.endpoint) throw new Error('Missing FREE_COMPRESSION_API_URL.');

    const body = new FormData();
    body.append('file', file);
    body.append('quality', String(quality));
    body.append('mode', mode);

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : undefined,
      body
    });

    if (!response.ok) throw new Error(`Free compression API failed (${response.status}).`);

    const ext = mode === 'zip' ? 'zip' : mode === 'pdf' ? 'pdf' : file.name.split('.').pop() ?? 'bin';

    return {
      filename: `${file.name.replace(/\.[^.]+$/, '')}.compressed.${ext}`,
      mimeType: response.headers.get('Content-Type') ?? 'application/octet-stream',
      data: Buffer.from(await response.arrayBuffer()),
      provider: 'free-advanced-compression-api',
      notes: 'Point FREE_COMPRESSION_API_URL to a free advanced compression backend (Cloudflare Worker/imgproxy/oss service).'
    };
  }
}

export function getCompressionProvider(): CompressionProvider {
  const provider = process.env.COMPRESSION_PROVIDER ?? 'external';
  if (provider === 'local') return new LocalCompressionProvider();
  return new FreeAdvancedCompressionProvider();
}
