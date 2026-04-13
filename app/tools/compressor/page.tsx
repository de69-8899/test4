'use client';

import { useState } from 'react';
import { FileDropzone } from '@/components/FileDropzone';
import { ResultPanel } from '@/components/ResultPanel';
import { getExtension } from '@/lib/validation';

export default function CompressorPage() {
  const [file, setFile] = useState<File | null>(null);
  const [quality, setQuality] = useState(75);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ blob: Blob; filename: string; provider?: string; notes?: string }>();

  const mode = file ? detectMode(file) : 'image';

  async function handleCompress() {
    if (!file) return;
    setLoading(true);
    setError('');

    const body = new FormData();
    body.append('file', file);
    body.append('quality', String(quality));
    body.append('mode', mode);

    const response = await fetch('/api/compress', { method: 'POST', body });
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
      filename: filenameMatch?.[1] ?? 'compressed.bin',
      provider: response.headers.get('X-Toolhub-Provider') ?? undefined,
      notes: response.headers.get('X-Toolhub-Notes') || undefined
    });

    setLoading(false);
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">File Compressor</h1>
      <FileDropzone file={file} onFile={setFile} />
      <p className="mt-3 text-sm text-slate-600">Detected mode: {mode}</p>
      <label className="mt-4 block text-sm">
        Compression quality: {quality}
        <input type="range" min={10} max={95} value={quality} onChange={(event) => setQuality(Number(event.target.value))} className="mt-1 w-full" />
      </label>
      <button className="mt-4 rounded-md bg-indigo-600 px-4 py-2 text-white disabled:opacity-60" disabled={!file || loading} onClick={handleCompress}>
        {loading ? 'Compressing...' : 'Compress'}
      </button>
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      <ResultPanel output={result?.blob} filename={result?.filename} provider={result?.provider} notes={result?.notes} beforeSize={file?.size} afterSize={result?.blob.size} />
    </div>
  );
}

function detectMode(file: File): 'image' | 'zip' | 'pdf' {
  const ext = getExtension(file.name);
  if (ext === 'zip') return 'zip';
  if (ext === 'pdf') return 'pdf';
  return 'image';
}
