import { NextResponse } from 'next/server';
import { getCompressionProvider } from '@/tools/providers/compression';
import { assertFileSize } from '@/lib/validation';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const quality = Number(formData.get('quality') ?? 75);
    const mode = String(formData.get('mode') ?? 'image') as 'image' | 'zip' | 'pdf';

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'File is required.' }, { status: 400 });
    }

    assertFileSize(file);
    const provider = getCompressionProvider();
    const result = await provider.compress({ file, quality, mode });

    return new NextResponse(new Uint8Array(result.data), {
      headers: {
        'Content-Type': result.mimeType,
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'X-Toolhub-Provider': result.provider
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Compression failed.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
