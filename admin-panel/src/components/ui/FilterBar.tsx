"use client";
import { ReactNode } from "react";

interface FilterBarProps {
  children: ReactNode;
  className?: string;
}

export function FilterBar({ children, className = "" }: FilterBarProps) {
  return (
    <div className={`bg-white rounded-xl border border-gray-100 p-4 flex flex-wrap items-center gap-3 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

interface FilterChipGroupProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}

export function FilterChipGroup({ options, value, onChange }: FilterChipGroupProps) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors whitespace-nowrap ${
            value === opt.value
              ? "bg-brand-500 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

interface DateRangePickerProps {
  from: string;
  to: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
}

export function DateRangePicker({ from, to, onFromChange, onToChange }: DateRangePickerProps) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="date"
        value={from}
        onChange={(e) => onFromChange(e.target.value)}
        className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500 text-gray-600"
      />
      <span className="text-gray-400 text-xs">—</span>
      <input
        type="date"
        value={to}
        onChange={(e) => onToChange(e.target.value)}
        className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500 text-gray-600"
      />
    </div>
  );
}

interface PerPageSelectProps {
  value: number;
  onChange: (v: number) => void;
}

export function PerPageSelect({ value, onChange }: PerPageSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500 text-gray-600 bg-white"
    >
      {[10, 25, 50, 100].map((n) => (
        <option key={n} value={n}>{n} ta</option>
      ))}
    </select>
  );
}
