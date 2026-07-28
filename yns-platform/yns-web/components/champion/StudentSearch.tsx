'use client';

import { useId } from 'react';
import { Search } from 'lucide-react';

export function StudentSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const inputId = useId();

  return (
    <div className="relative w-full sm:w-[268px]">
      <label htmlFor={inputId} className="sr-only">
        Search students
      </label>
      <Search
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
        aria-hidden="true"
      />
      <input
        id={inputId}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search students"
        autoComplete="off"
        className="h-11 w-full rounded-xl border border-neutral-200 bg-white pl-10 pr-3 text-sm font-medium text-neutral-900 transition-colors placeholder:font-normal placeholder:text-neutral-400 focus:border-maroon-700 focus:outline-none focus:ring-1 focus:ring-maroon-700"
      />
    </div>
  );
}
