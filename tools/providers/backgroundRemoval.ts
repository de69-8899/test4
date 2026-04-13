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
      notes: 'MVP provider removes near-white background only. Replace with external AI API for production quality.'
    };
  }
}

export class ExternalBackgroundRemovalProvider implements BackgroundRemovalProvider {
  async remove(): Promise<BackgroundRemoveOutput> {
    throw new Error('External background removal provider is not configured.');
  }
}

export function getBackgroundRemovalProvider(): BackgroundRemovalProvider {
  return (process.env.BG_REMOVAL_PROVIDER ?? 'local') === 'external'
    ? new ExternalBackgroundRemovalProvider()
    : new LocalBackgroundRemovalProvider();
}
