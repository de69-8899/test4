'use client';

import { useRef } from 'react';

interface Props {
  file: File | null;
  onFile: (file: File) => void;
  accept?: string;
}

export function FileDropzone({ file, onFile, accept }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-6 text-center"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const dropped = event.dataTransfer.files?.[0];
        if (dropped) onFile(dropped);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept}
        onChange={(event) => {
          const selected = event.target.files?.[0];
          if (selected) onFile(selected);
        }}
      />
      <p className="text-sm text-slate-600">Drag & drop a file here, or</p>
      <button type="button" className="mt-2 rounded-md bg-indigo-600 px-3 py-2 text-sm text-white" onClick={() => inputRef.current?.click()}>
        Browse file
      </button>
      {file ? <p className="mt-3 text-sm text-slate-700">Selected: {file.name}</p> : null}
    </div>
  );
}
