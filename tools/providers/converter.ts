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
        provider: 'local-image-sharp'
      };
    }

    if (format === 'pdf' && file.type.startsWith('text/')) {
      const text = sourceBuffer.toString('utf-8');
      const pdf = await createTextPdf(text);
      return {
        filename: `${baseName}.pdf`,
        mimeType: 'application/pdf',
        data: pdf,
        provider: 'local-pdf-lib'
      };
    }

    if (format === 'pdf' && file.type === 'text/html') {
      const htmlText = sourceBuffer.toString('utf-8').replace(/<[^>]*>/g, '');
      const pdf = await createTextPdf(htmlText);
      return {
        filename: `${baseName}.pdf`,
        mimeType: 'application/pdf',
        data: pdf,
        provider: 'local-pdf-lib',
        notes: 'HTML is converted to plain text before PDF generation in MVP mode.'
      };
    }

    throw new Error('Unsupported local conversion. Use external provider adapters for this format pair.');
  }
}

export class ExternalConversionProvider implements ImageConverterProvider {
  async convert(): Promise<ConvertOutput> {
    throw new Error('External conversion provider is not configured yet. Set CONVERTER_PROVIDER=external and implement API calls.');
  }
}

export function getConverterProvider(): ImageConverterProvider {
  const provider = process.env.CONVERTER_PROVIDER ?? 'local';
  return provider === 'external' ? new ExternalConversionProvider() : new LocalImageConverterProvider();
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
