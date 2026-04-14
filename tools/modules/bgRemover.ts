import { ToolDefinition } from '@/types/tool';

export const bgRemoverTool: ToolDefinition = {
  id: 'image-background-remover',
  name: 'Image Background Remover',
  description: 'Remove simple white/near-white backgrounds using a lightweight local provider.',
  route: '/tools/bg-remover',
  icon: '🖼️',
  category: 'image',
  supportedFormats: ['PNG', 'JPG', 'JPEG', 'WEBP → PNG'],
  enabled: true
};
