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

    throw new Error('PDF compression should use external provider in this starter.');
  }
}

export class ExternalCompressionProvider implements CompressionProvider {
  async compress(): Promise<CompressOutput> {
    throw new Error('External compression provider is not configured yet.');
  }
}

export function getCompressionProvider(): CompressionProvider {
  return (process.env.COMPRESSION_PROVIDER ?? 'local') === 'external'
    ? new ExternalCompressionProvider()
    : new LocalCompressionProvider();
}
