'use client';

import { useState } from 'react';
import { FileDropzone } from '@/components/FileDropzone';
import { ResultPanel } from '@/components/ResultPanel';

const formats = ['jpg', 'png', 'webp', 'pdf'];

export default function ConverterPage() {
  const [file, setFile] = useState<File | null>(null);
  const [targetFormat, setTargetFormat] = useState('jpg');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ blob: Blob; filename: string; provider?: string; notes?: string }>();

  async function handleConvert() {
    if (!file) return;
    setLoading(true);
    setError('');
    setResult(undefined);

    const body = new FormData();
    body.append('file', file);
    body.append('targetFormat', targetFormat);

    const response = await fetch('/api/convert', { method: 'POST', body });
    if (!response.ok) {
      const json = (await response.json()) as { error: string };
      setError(json.error);
      setLoading(false);
      return;
    }

    const blob = await response.blob();
    const contentDisposition = response.headers.get('Content-Disposition') ?? '';
    const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);

    setResult({
      blob,
      filename: filenameMatch?.[1] ?? `converted.${targetFormat}`,
      provider: response.headers.get('X-Toolhub-Provider') ?? undefined,
      notes: response.headers.get('X-Toolhub-Notes') || undefined
    });
    setLoading(false);
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">File Converter</h1>
      <FileDropzone file={file} onFile={setFile} />
      <label className="mt-4 block text-sm text-slate-700 dark:text-slate-200">
        Target format
        <select className="mt-1 w-full rounded-md border p-2" value={targetFormat} onChange={(event) => setTargetFormat(event.target.value)}>
          {formats.map((format) => (
            <option key={format}>{format}</option>
          ))}
        </select>
      </label>
      <button className="mt-4 rounded-md bg-indigo-600 px-4 py-2 text-white disabled:opacity-60" disabled={!file || loading} onClick={handleConvert}>
        {loading ? 'Converting...' : 'Convert'}
      </button>
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      <ResultPanel output={result?.blob} filename={result?.filename} provider={result?.provider} notes={result?.notes} beforeSize={file?.size} afterSize={result?.blob.size} />
    </div>
  );
}
