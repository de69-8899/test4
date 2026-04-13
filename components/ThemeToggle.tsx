'use client';

import { useThemeMode } from './ThemeProvider';

const modes: Array<'system' | 'light' | 'dark'> = ['system', 'light', 'dark'];

export function ThemeToggle() {
  const { mode, setMode } = useThemeMode();

  return (
    <div className="flex gap-1 rounded-lg border border-slate-300 bg-white p-1 text-xs dark:border-slate-700 dark:bg-slate-900">
      {modes.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => setMode(item)}
          className={`rounded px-2 py-1 capitalize ${mode === item ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
