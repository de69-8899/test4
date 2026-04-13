import { ToolCard } from '@/components/ToolCard';
import { enabledTools } from '@/tools/registry';

export default function Home() {
  return (
    <div>
      <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-900">
        <h1 className="text-2xl font-bold">ToolHub</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">Production-minded starter for online file tools, optimized for Vercel Hobby.</p>
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        {enabledTools.map((tool) => (
          <ToolCard key={tool.id} tool={tool} />
        ))}
      </section>
    </div>
  );
}
