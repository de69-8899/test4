'use client';

import { useState } from 'react';
import { FileDropzone } from '@/components/FileDropzone';
import { ResultPanel } from '@/components/ResultPanel';

export default function BackgroundRemoverPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ blob: Blob; filename: string; provider?: string; notes?: string }>();

  async function handleRemove() {
    if (!file) return;
    setLoading(true);
    setError('');

    const body = new FormData();
    body.append('file', file);

    const response = await fetch('/api/remove-bg', { method: 'POST', body });
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
      filename: filenameMatch?.[1] ?? 'transparent.png',
      provider: response.headers.get('X-Toolhub-Provider') ?? undefined,
      notes: response.headers.get('X-Toolhub-Notes') || undefined
    });

    setLoading(false);
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Image Background Remover</h1>
      <FileDropzone file={file} onFile={setFile} accept="image/png,image/jpeg,image/webp" />
      <button className="mt-4 rounded-md bg-indigo-600 px-4 py-2 text-white disabled:opacity-60" disabled={!file || loading} onClick={handleRemove}>
        {loading ? 'Removing background...' : 'Remove background'}
      </button>
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      <ResultPanel output={result?.blob} filename={result?.filename} provider={result?.provider} notes={result?.notes} beforeSize={file?.size} afterSize={result?.blob.size} />
    </div>
  );
}
