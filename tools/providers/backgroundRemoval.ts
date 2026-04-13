import sharp from 'sharp';

export interface BackgroundRemoveInput {
  file: File;
}

export interface BackgroundRemoveOutput {
  filename: string;
  data: Buffer;
  mimeType: string;
  provider: string;
  notes?: string;
}

export interface BackgroundRemovalProvider {
  remove(input: BackgroundRemoveInput): Promise<BackgroundRemoveOutput>;
}

export class LocalBackgroundRemovalProvider implements BackgroundRemovalProvider {
  async remove({ file }: BackgroundRemoveInput): Promise<BackgroundRemoveOutput> {
    const sourceBuffer = Buffer.from(await file.arrayBuffer());
    const image = sharp(sourceBuffer).ensureAlpha();
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

    for (let index = 0; index < data.length; index += info.channels) {
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const nearWhite = r > 235 && g > 235 && b > 235;
      if (nearWhite) data[index + 3] = 0;
    }

    const transparentPng = await sharp(data, {
      raw: {
        width: info.width,
        height: info.height,
        channels: info.channels
      }
    })
      .png()
      .toBuffer();

    return {
      filename: `${file.name.replace(/\.[^.]+$/, '')}.transparent.png`,
      data: transparentPng,
      mimeType: 'image/png',
      provider: 'local-threshold-mock',
      notes: 'MVP fallback removed near-white background only.'
    };
  }
}

export class RemoveBgProvider implements BackgroundRemovalProvider {
  private apiKey = process.env.REMOVEBG_API_KEY;

  async remove({ file }: BackgroundRemoveInput): Promise<BackgroundRemoveOutput> {
    if (!this.apiKey) throw new Error('Missing REMOVEBG_API_KEY for advanced background removal.');

    const body = new FormData();
    body.append('image_file', file);
    body.append('size', 'preview');
    body.append('format', 'png');

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': this.apiKey
      },
      body
    });

    if (!response.ok) {
      throw new Error(`remove.bg failed (${response.status}).`);
    }

    return {
      filename: `${file.name.replace(/\.[^.]+$/, '')}.transparent.png`,
      data: Buffer.from(await response.arrayBuffer()),
      mimeType: 'image/png',
      provider: 'removebg-advanced'
    };
  }
}

export function getBackgroundRemovalProvider(): BackgroundRemovalProvider {
  const provider = process.env.BG_REMOVAL_PROVIDER ?? 'auto';
  if (provider === 'external' || (provider === 'auto' && process.env.REMOVEBG_API_KEY)) {
    return new RemoveBgProvider();
  }
  return new LocalBackgroundRemovalProvider();
}
