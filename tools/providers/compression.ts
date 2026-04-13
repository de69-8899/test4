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
        provider: 'local-sharp'
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
        provider: 'local-jszip'
      };
    }

    throw new Error('PDF compression should use advanced external APIs.');
  }
}

export class AdvancedCompressionProvider implements CompressionProvider {
  private tinyPngKey = process.env.TINYPNG_API_KEY;
  private advancedPdfEndpoint = process.env.ADVANCED_PDF_COMPRESS_API_URL;

  async compress({ file, mode }: CompressInput): Promise<CompressOutput> {
    if (mode === 'image') return this.compressImage(file);
    if (mode === 'pdf') return this.compressPdf(file);
    throw new Error('ZIP mode is currently local-only for Vercel cost control.');
  }

  private async compressImage(file: File): Promise<CompressOutput> {
    if (!this.tinyPngKey) throw new Error('Missing TINYPNG_API_KEY for advanced image compression.');

    const sourceBuffer = Buffer.from(await file.arrayBuffer());
    const shrinkResponse = await fetch('https://api.tinify.com/shrink', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`api:${this.tinyPngKey}`).toString('base64')}`
      },
      body: sourceBuffer
    });

    if (!shrinkResponse.ok) throw new Error(`TinyPNG compression failed (${shrinkResponse.status}).`);
    const outputUrl = shrinkResponse.headers.get('Location');
    if (!outputUrl) throw new Error('TinyPNG did not return output location.');

    const outputResponse = await fetch(outputUrl, {
      headers: {
        Authorization: `Basic ${Buffer.from(`api:${this.tinyPngKey}`).toString('base64')}`
      }
    });

    if (!outputResponse.ok) throw new Error('TinyPNG output download failed.');

    const result = Buffer.from(await outputResponse.arrayBuffer());
    const extension = file.name.split('.').pop() ?? 'png';

    return {
      filename: `${file.name.replace(/\.[^.]+$/, '')}.compressed.${extension}`,
      mimeType: file.type,
      data: result,
      provider: 'tinypng-advanced'
    };
  }

  private async compressPdf(file: File): Promise<CompressOutput> {
    if (!this.advancedPdfEndpoint) {
      throw new Error('Set ADVANCED_PDF_COMPRESS_API_URL for advanced PDF compression provider.');
    }

    const body = new FormData();
    body.append('file', file);

    const response = await fetch(this.advancedPdfEndpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.ADVANCED_PDF_COMPRESS_API_KEY ?? ''}`
      },
      body
    });

    if (!response.ok) throw new Error(`Advanced PDF API failed (${response.status}).`);

    return {
      filename: `${file.name.replace(/\.[^.]+$/, '')}.compressed.pdf`,
      mimeType: 'application/pdf',
      data: Buffer.from(await response.arrayBuffer()),
      provider: 'advanced-pdf-api',
      notes: 'PDF endpoint should point to your preferred enterprise compression API.'
    };
  }
}

export function getCompressionProvider(): CompressionProvider {
  const provider = process.env.COMPRESSION_PROVIDER ?? 'auto';
  if (provider === 'external' || (provider === 'auto' && (process.env.TINYPNG_API_KEY || process.env.ADVANCED_PDF_COMPRESS_API_URL))) {
    return new AdvancedCompressionProvider();
  }
  return new LocalCompressionProvider();
}
