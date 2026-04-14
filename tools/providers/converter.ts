import sharp from 'sharp';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export interface ConvertInput {
  file: File;
  targetFormat: string;
}

export interface ConvertOutput {
  filename: string;
  mimeType: string;
  data: Buffer;
  provider: string;
  notes?: string;
}

export interface ImageConverterProvider {
  convert(input: ConvertInput): Promise<ConvertOutput>;
}

const imageFormats = new Set(['jpg', 'jpeg', 'png', 'webp']);

export class LocalImageConverterProvider implements ImageConverterProvider {
  async convert({ file, targetFormat }: ConvertInput): Promise<ConvertOutput> {
    const sourceBuffer = Buffer.from(await file.arrayBuffer());
    const format = targetFormat.toLowerCase();
    const baseName = file.name.replace(/\.[^.]+$/, '');

    if (imageFormats.has(format)) {
      const data = await sharp(sourceBuffer).toFormat(format as keyof sharp.FormatEnum).toBuffer();
      return {
        filename: `${baseName}.${format === 'jpeg' ? 'jpg' : format}`,
        mimeType: `image/${format === 'jpg' ? 'jpeg' : format}`,
        data,
        provider: 'local-open-source'
      };
    }

    if (format === 'pdf' && (file.type.startsWith('text/') || file.type === 'text/html')) {
      const text = sourceBuffer.toString('utf-8').replace(/<[^>]*>/g, '');
      const pdf = await createTextPdf(text);
      return {
        filename: `${baseName}.pdf`,
        mimeType: 'application/pdf',
        data: pdf,
        provider: 'local-open-source',
        notes: file.type === 'text/html' ? 'HTML converted via text extraction in local mode.' : undefined
      };
    }

    throw new Error('Unsupported local conversion. Configure FREE_CONVERTER_API_URL for advanced free API conversion.');
  }
}

export class FreeAdvancedConverterProvider implements ImageConverterProvider {
  private endpoint = process.env.FREE_CONVERTER_API_URL;
  private apiKey = process.env.FREE_CONVERTER_API_KEY;

  async convert({ file, targetFormat }: ConvertInput): Promise<ConvertOutput> {
    if (!this.endpoint) throw new Error('Missing FREE_CONVERTER_API_URL.');

    const body = new FormData();
    body.append('file', file);
    body.append('targetFormat', targetFormat);

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : undefined,
      body
    });

    if (!response.ok) throw new Error(`Free converter API failed (${response.status}).`);

    return {
      filename: `${file.name.replace(/\.[^.]+$/, '')}.${targetFormat}`,
      mimeType: response.headers.get('Content-Type') ?? 'application/octet-stream',
      data: Buffer.from(await response.arrayBuffer()),
      provider: 'free-advanced-converter-api',
      notes: 'Point FREE_CONVERTER_API_URL to a free advanced conversion backend (Cloudflare Worker/Gotenberg/LibreOffice service).'
    };
  }
}

export function getConverterProvider(): ImageConverterProvider {
  const provider = process.env.CONVERTER_PROVIDER ?? 'external';
  if (provider === 'local') return new LocalImageConverterProvider();
  return new FreeAdvancedConverterProvider();
}

async function createTextPdf(text: string): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const lines = text.split(/\r?\n/).slice(0, 80);

  lines.forEach((line, index) => {
    page.drawText(line.slice(0, 100), {
      x: 36,
      y: 800 - index * 16,
      font,
      size: 11,
      color: rgb(0, 0, 0)
    });
  });

  return Buffer.from(await pdfDoc.save());
}
