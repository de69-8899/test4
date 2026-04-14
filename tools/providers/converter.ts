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

    throw new Error('Unsupported local conversion. Configure CLOUDCONVERT_API_KEY for advanced conversion.');
  }
}

export class CloudConvertProvider implements ImageConverterProvider {
  private apiKey = process.env.CLOUDCONVERT_API_KEY;
  private baseUrl = 'https://api.cloudconvert.com/v2/';

  async convert({ file, targetFormat }: ConvertInput): Promise<ConvertOutput> {
    if (!this.apiKey) throw new Error('Missing CLOUDCONVERT_API_KEY.');

    const body = {
      tasks: {
        import: {
          operation: 'import/base64',
          file: Buffer.from(await file.arrayBuffer()).toString('base64'),
          filename: file.name
        },
        convert: {
          operation: 'convert',
          input: 'import',
          output_format: targetFormat.toLowerCase()
        },
        export: {
          operation: 'export/url',
          input: 'convert'
        }
      }
    };

    const createJob = await fetch(`${this.baseUrl}jobs`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!createJob.ok) throw new Error(`CloudConvert create job failed (${createJob.status}).`);

    const job = (await createJob.json()) as { data: { id: string } };
    const fileResult = await this.pollJob(job.data.id);

    const download = await fetch(fileResult.url);
    if (!download.ok) throw new Error('CloudConvert download failed.');

    return {
      filename: fileResult.filename,
      mimeType: fileResult.content_type ?? 'application/octet-stream',
      data: Buffer.from(await download.arrayBuffer()),
      provider: 'cloudconvert-api',
      notes: 'Uses https://api.cloudconvert.com/v2/.'
    };
  }

  private async pollJob(jobId: string): Promise<{ filename: string; url: string; content_type?: string }> {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const response = await fetch(`${this.baseUrl}jobs/${jobId}`, {
        headers: { Authorization: `Bearer ${this.apiKey}` }
      });

      if (!response.ok) throw new Error('CloudConvert polling failed.');

      const payload = (await response.json()) as {
        data: {
          status: string;
          tasks: Array<{ name: string; result?: { files?: Array<{ filename: string; url: string; content_type?: string }> } }>;
        };
      };

      const file = payload.data.tasks.find((task) => task.name === 'export')?.result?.files?.[0];
      if (payload.data.status === 'finished' && file) return file;
      if (payload.data.status === 'error') throw new Error('CloudConvert job failed.');

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    throw new Error('CloudConvert job timed out.');
  }
}

export function getConverterProvider(): ImageConverterProvider {
  const provider = process.env.CONVERTER_PROVIDER ?? 'external';
  if (provider === 'local') return new LocalImageConverterProvider();
  return new CloudConvertProvider();
}

async function createTextPdf(text: string): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  text.split(/\r?\n/)
    .slice(0, 80)
    .forEach((line, index) => {
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
