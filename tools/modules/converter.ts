import { ToolDefinition } from '@/types/tool';

export const converterTool: ToolDefinition = {
  id: 'file-converter',
  name: 'File Converter',
  description: 'Convert lightweight image/document formats with provider-based architecture.',
  route: '/tools/converter',
  icon: '🔄',
  category: 'conversion',
  supportedFormats: [
    'JPG',
    'JPEG',
    'PNG',
    'WEBP',
    'GIF (basic input)',
    'SVG (passthrough)',
    'TXT → PDF',
    'HTML → PDF',
    'PDF → TXT (provider placeholder)'
  ],
  enabled: true
};
