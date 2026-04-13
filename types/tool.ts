export type ToolCategory = 'conversion' | 'compression' | 'image';

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  route: `/tools/${string}`;
  icon: string;
  category: ToolCategory;
  supportedFormats: string[];
  enabled: boolean;
}
