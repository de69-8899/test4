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
      raw: { width: info.width, height: info.height, channels: info.channels }
    })
      .png()
      .toBuffer();

    return {
      filename: `${file.name.replace(/\.[^.]+$/, '')}.transparent.png`,
      data: transparentPng,
      mimeType: 'image/png',
      provider: 'local-open-source',
      notes: 'MVP fallback removed near-white background only.'
    };
  }
}

export class FreeAdvancedBackgroundRemovalProvider implements BackgroundRemovalProvider {
  private endpoint = process.env.FREE_BG_REMOVAL_API_URL;
  private apiKey = process.env.FREE_BG_REMOVAL_API_KEY;

  async remove({ file }: BackgroundRemoveInput): Promise<BackgroundRemoveOutput> {
    if (!this.endpoint) throw new Error('Missing FREE_BG_REMOVAL_API_URL.');

    const body = new FormData();
    body.append('file', file);

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : undefined,
      body
    });

    if (!response.ok) throw new Error(`Free background-removal API failed (${response.status}).`);

    return {
      filename: `${file.name.replace(/\.[^.]+$/, '')}.transparent.png`,
      data: Buffer.from(await response.arrayBuffer()),
      mimeType: 'image/png',
      provider: 'free-advanced-bg-api',
      notes: 'Point FREE_BG_REMOVAL_API_URL to a free advanced model endpoint (e.g. HuggingFace Space / Cloudflare AI Worker).'
    };
  }
}

export function getBackgroundRemovalProvider(): BackgroundRemovalProvider {
  const provider = process.env.BG_REMOVAL_PROVIDER ?? 'external';
  if (provider === 'local') return new LocalBackgroundRemovalProvider();
  return new FreeAdvancedBackgroundRemovalProvider();
}
