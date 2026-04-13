import { NextResponse } from 'next/server';
import { getConverterProvider } from '@/tools/providers/converter';
import { assertFileSize } from '@/lib/validation';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const targetFormat = String(formData.get('targetFormat') ?? '').toLowerCase();

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'File is required.' }, { status: 400 });
    }

    assertFileSize(file);
    const provider = getConverterProvider();
    const result = await provider.convert({ file, targetFormat });

    return new NextResponse(new Uint8Array(result.data), {
      headers: {
        'Content-Type': result.mimeType,
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'X-Toolhub-Provider': result.provider,
        'X-Toolhub-Notes': result.notes ?? ''
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Conversion failed.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
