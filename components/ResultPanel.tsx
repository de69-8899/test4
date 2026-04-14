'use client';

import { formatBytes } from '@/lib/format';

interface Props {
  output?: Blob;
  filename?: string;
  provider?: string;
  notes?: string;
  beforeSize?: number;
  afterSize?: number;
}

export function ResultPanel({ output, filename, provider, notes, beforeSize, afterSize }: Props) {
  if (!output || !filename) return null;

  const href = URL.createObjectURL(output);
  const ratio = beforeSize && afterSize ? `${(((beforeSize - afterSize) / beforeSize) * 100).toFixed(1)}%` : null;

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <h3 className="font-semibold">Result</h3>
      {beforeSize && afterSize ? (
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Before: {formatBytes(beforeSize)} • After: {formatBytes(afterSize)} • Ratio: {ratio}
        </p>
      ) : null}
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Provider: {provider ?? 'n/a'}</p>
      {notes ? <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">Note: {notes}</p> : null}
      <a className="mt-3 inline-block rounded-md bg-emerald-600 px-3 py-2 text-sm text-white" href={href} download={filename}>
        Download {filename}
      </a>
    </div>
  );
}
