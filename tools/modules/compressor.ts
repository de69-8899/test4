import { ToolDefinition } from '@/types/tool';

export const compressorTool: ToolDefinition = {
  id: 'file-compressor',
  name: 'File Compressor',
  description: 'Compress images and create ZIP archives with ratio reporting.',
  route: '/tools/compressor',
  icon: '🗜️',
  category: 'compression',
  supportedFormats: ['JPG', 'PNG', 'WEBP', 'ZIP', 'PDF (provider placeholder)'],
  enabled: true
};
