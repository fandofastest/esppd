"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface SearchableOption {
  value: string;
  label: string;
  keywords?: string[];
}

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SearchableOption[];
  placeholder: string;
  emptyText?: string;
  disabled?: boolean;
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  emptyText = "Data tidak ditemukan.",
  disabled = false,
}: SearchableSelectProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedOption = useMemo(
    () => options.find((item) => item.value === value) ?? null,
    [options, value],
  );

  useEffect(() => {
    setQuery(selectedOption?.label ?? "");
  }, [selectedOption]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const filteredOptions = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    if (!keyword) {
      return options.slice(0, 50);
    }

    return options
      .filter((item) => {
        const candidates = [item.label, ...(item.keywords ?? [])].map((text) => text.toLowerCase());
        return candidates.some((text) => text.includes(keyword));
      })
      .slice(0, 50);
  }, [options, query]);

  return (
    <div className="relative" ref={rootRef}>
      <input
        className="input"
        value={query}
        placeholder={placeholder}
        disabled={disabled}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          if (value) {
            onChange("");
          }
        }}
      />

      {open ? (
        <div className="absolute z-20 mt-2 max-h-64 w-full overflow-auto rounded-2xl border border-[#dde2ec] bg-white p-2 shadow-[0_20px_40px_rgba(15,23,42,0.10)]">
          {filteredOptions.length > 0 ? (
            <div className="space-y-1">
              {filteredOptions.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                    item.value === value
                      ? "bg-[#fff0ef] font-semibold text-[#d94841]"
                      : "text-[#3f4758] hover:bg-[#f5f7fb]"
                  }`}
                  onClick={() => {
                    onChange(item.value);
                    setQuery(item.label);
                    setOpen(false);
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : (
            <p className="px-3 py-2 text-sm text-[#7c8597]">{emptyText}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
