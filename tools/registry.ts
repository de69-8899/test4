import { ToolDefinition } from '@/types/tool';
import { converterTool } from './modules/converter';
import { compressorTool } from './modules/compressor';
import { bgRemoverTool } from './modules/bgRemover';

export const toolRegistry: ToolDefinition[] = [converterTool, compressorTool, bgRemoverTool];

export const enabledTools = toolRegistry.filter((tool) => tool.enabled);
