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

    if (format === 'pdf' && (file.type.startsWith('text/') || file.type === 'text/html')) {
      const text = sourceBuffer.toString('utf-8').replace(/<[^>]*>/g, '');
      const pdf = await createTextPdf(text);
      return {
        filename: `${baseName}.pdf`,
        mimeType: 'application/pdf',
        data: pdf,
        provider: 'local-pdf-lib',
        notes: file.type === 'text/html' ? 'HTML converted via text extraction in local mode.' : undefined
      };
    }

    throw new Error('Unsupported local conversion. Configure advanced external conversion for this format pair.');
  }
}

export class CloudConvertProvider implements ImageConverterProvider {
  private apiKey = process.env.CLOUDCONVERT_API_KEY;

  async convert({ file, targetFormat }: ConvertInput): Promise<ConvertOutput> {
    if (!this.apiKey) {
      throw new Error('Missing CLOUDCONVERT_API_KEY.');
    }

    const source = Buffer.from(await file.arrayBuffer()).toString('base64');
    const target = targetFormat.toLowerCase();

    const body = {
      tasks: {
        import: {
          operation: 'import/base64',
          file: source,
          filename: file.name
        },
        convert: {
          operation: 'convert',
          input: 'import',
          output_format: target,
          engine: 'office'
        },
        export: {
          operation: 'export/url',
          input: 'convert',
          inline: false,
          archive_multiple_files: false
        }
      },
      tag: 'toolhub-convert'
    };

    const response = await fetch('https://api.cloudconvert.com/v2/jobs', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`CloudConvert error (${response.status}).`);
    }

    const job = (await response.json()) as { data: { id: string } };
    const output = await pollCloudConvertResult(job.data.id, this.apiKey);

    const downloadResponse = await fetch(output.url);
    if (!downloadResponse.ok) {
      throw new Error('Failed to download converted file from CloudConvert.');
    }

    const data = Buffer.from(await downloadResponse.arrayBuffer());
    return {
      filename: output.filename,
      mimeType: output.content_type ?? 'application/octet-stream',
      data,
      provider: 'cloudconvert-advanced'
    };
  }
}

export function getConverterProvider(): ImageConverterProvider {
  const provider = process.env.CONVERTER_PROVIDER ?? 'auto';
  if (provider === 'external' || (provider === 'auto' && process.env.CLOUDCONVERT_API_KEY)) {
    return new CloudConvertProvider();
  }
  return new LocalImageConverterProvider();
}

async function pollCloudConvertResult(jobId: string, apiKey: string) {
  for (let attempt = 0; attempt < 15; attempt += 1) {
    const result = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobId}`, {
      headers: { Authorization: `Bearer ${apiKey}` }
    });

    if (!result.ok) throw new Error('Failed polling CloudConvert job.');

    const payload = (await result.json()) as {
      data: { status: string; tasks: Array<{ name: string; status: string; result?: { files?: Array<{ filename: string; url: string; content_type?: string }> } }> };
    };

    const exportTask = payload.data.tasks.find((task) => task.name === 'export');
    const file = exportTask?.result?.files?.[0];

    if (payload.data.status === 'finished' && file) return file;
    if (payload.data.status === 'error') throw new Error('CloudConvert job failed.');

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error('CloudConvert job timeout.');
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
