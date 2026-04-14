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

    throw new Error('PDF compression requires external provider.');
  }
}

export class TinifyCompressionProvider implements CompressionProvider {
  private apiKey = process.env.TINYPNG_API_KEY;
  private apiUrl = 'https://api.tinify.com/';

  async compress({ file, mode }: CompressInput): Promise<CompressOutput> {
    if (!this.apiKey) throw new Error('Missing TINYPNG_API_KEY.');
    if (mode !== 'image') throw new Error('Tinify API supports image compression only in this integration.');

    const input = Buffer.from(await file.arrayBuffer());
    const auth = `Basic ${Buffer.from(`api:${this.apiKey}`).toString('base64')}`;

    const shrink = await fetch(`${this.apiUrl}shrink`, {
      method: 'POST',
      headers: { Authorization: auth },
      body: input
    });

    if (!shrink.ok) throw new Error(`Tinify compression failed (${shrink.status}).`);
    const outputUrl = shrink.headers.get('Location');
    if (!outputUrl) throw new Error('Tinify response missing output URL.');

    const output = await fetch(outputUrl, { headers: { Authorization: auth } });
    if (!output.ok) throw new Error('Tinify output download failed.');

    return {
      filename: `${file.name.replace(/\.[^.]+$/, '')}.compressed.${file.name.split('.').pop() ?? 'png'}`,
      mimeType: output.headers.get('Content-Type') ?? file.type,
      data: Buffer.from(await output.arrayBuffer()),
      provider: 'tinify-api',
      notes: 'Uses https://api.tinify.com/.'
    };
  }
}

export function getCompressionProvider(): CompressionProvider {
  const provider = process.env.COMPRESSION_PROVIDER ?? 'external';
  if (provider === 'local') return new LocalCompressionProvider();
  return new TinifyCompressionProvider();
}
