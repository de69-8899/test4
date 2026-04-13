import Link from 'next/link';
import { ToolDefinition } from '@/types/tool';

export function ToolCard({ tool }: { tool: ToolDefinition }) {
  return (
    <Link href={tool.route as never} className="rounded-xl border bg-white p-4 shadow-sm transition hover:shadow-md">
      <p className="text-2xl">{tool.icon}</p>
      <h2 className="mt-2 text-lg font-semibold">{tool.name}</h2>
      <p className="mt-1 text-sm text-slate-600">{tool.description}</p>
      <p className="mt-3 text-xs text-slate-500">{tool.supportedFormats.join(' • ')}</p>
    </Link>
  );
}
