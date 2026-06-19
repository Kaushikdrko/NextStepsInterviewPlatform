'use client';

import { useMemo, useRef, useState } from 'react';
import { Check, Search } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type SearchableSelectInputProps = {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  options: readonly string[];
  placeholder?: string;
};

const MAX_VISIBLE_OPTIONS = 80;

export function SearchableSelectInput({
  value,
  onChange,
  onBlur,
  options,
  placeholder,
}: SearchableSelectInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filteredOptions = useMemo(() => {
    const query = value.trim().toLowerCase();

    if (!query) {
      return options.slice(0, MAX_VISIBLE_OPTIONS);
    }

    const startsWithMatches: string[] = [];
    const includesMatches: string[] = [];

    options.forEach((option) => {
      const normalized = option.toLowerCase();

      if (normalized.startsWith(query)) {
        startsWithMatches.push(option);
      } else if (normalized.includes(query)) {
        includesMatches.push(option);
      }
    });

    return [...startsWithMatches, ...includesMatches].slice(0, MAX_VISIBLE_OPTIONS);
  }, [options, value]);

  const showOptions = isOpen && filteredOptions.length > 0;

  const selectOption = (option: string) => {
    onChange(option);
    setIsOpen(false);
    setActiveIndex(0);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <Input
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setIsOpen(true);
            setActiveIndex(0);
          }}
          onFocus={() => {
            if (blurTimeoutRef.current) {
              clearTimeout(blurTimeoutRef.current);
            }

            setIsOpen(true);
          }}
          onBlur={() => {
            blurTimeoutRef.current = setTimeout(() => setIsOpen(false), 120);
            onBlur?.();
          }}
          onKeyDown={(event) => {
            if (!showOptions) {
              if (event.key === 'ArrowDown') {
                setIsOpen(true);
              }
              return;
            }

            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setActiveIndex((index) => (index + 1) % filteredOptions.length);
            }

            if (event.key === 'ArrowUp') {
              event.preventDefault();
              setActiveIndex((index) => (index - 1 + filteredOptions.length) % filteredOptions.length);
            }

            if (event.key === 'Enter') {
              event.preventDefault();
              selectOption(filteredOptions[activeIndex]);
            }

            if (event.key === 'Escape') {
              setIsOpen(false);
            }
          }}
          placeholder={placeholder}
          className="pl-9"
          role="combobox"
          aria-expanded={showOptions}
          aria-autocomplete="list"
        />
      </div>

      {showOptions ? (
        <div className="absolute left-0 right-0 z-30 mt-2 max-h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-lg shadow-slate-200/70">
          {filteredOptions.map((option, index) => {
            const isSelected = option === value;
            const isActive = index === activeIndex;

            return (
              <button
                key={option}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectOption(option)}
                className={cn(
                  'flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-700',
                  isActive ? 'bg-indigo-50 text-indigo-700' : '',
                )}
              >
                <span>{option}</span>
                {isSelected ? <Check className="h-4 w-4 text-indigo-500" aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
