"use client";

import { useState, type ReactNode } from "react";
import Badge from "@/components/Badge";
import type { WorkspaceSectionId } from "@/lib/workspace";

interface WorkspaceSectionProps {
  id: WorkspaceSectionId;
  title: string;
  description?: string;
  icon?: ReactNode;
  value: string;
  original: string;
  rows?: number;
  onChange: (value: string) => void;
  onCopy: () => void;
  onRegenerate: () => void;
  onReset: () => void;
  regenerating?: boolean;
  defaultExpanded?: boolean;
}

export default function WorkspaceSection({
  title,
  description,
  icon,
  value,
  original,
  rows = 10,
  onChange,
  onCopy,
  onRegenerate,
  onReset,
  regenerating = false,
  defaultExpanded = true,
}: WorkspaceSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [copied, setCopied] = useState(false);
  const edited = value !== original;

  const handleCopy = async () => {
    onCopy();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-[#fafaf9] px-5 py-4">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex min-w-0 flex-1 items-start gap-3 text-left"
        >
          {icon && (
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 ring-1 ring-inset ring-slate-200/80">
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[15px] font-semibold tracking-tight text-slate-900">
                {title}
              </h3>
              {edited && (
                <Badge tone="amber" dot>
                  Edited
                </Badge>
              )}
            </div>
            {description && (
              <p className="mt-0.5 text-sm text-slate-500">{description}</p>
            )}
          </div>
          <svg
            className={`mt-1 h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 ${
              expanded ? "rotate-180" : ""
            }`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {expanded && (
        <>
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-white px-5 py-2.5">
            <ActionButton
              label={copied ? "Copied" : "Copy"}
              onClick={handleCopy}
              active={copied}
            />
            <ActionButton
              label={regenerating ? "Regenerating…" : "Regenerate Section"}
              onClick={onRegenerate}
              disabled={regenerating}
            />
            <ActionButton
              label="Reset"
              onClick={onReset}
              disabled={!edited}
            />
          </div>
          <div className="bg-[#fefefe] p-5">
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              rows={rows}
              className="w-full resize-y rounded-lg border border-slate-200 bg-white px-4 py-3.5 font-serif text-[15px] leading-[1.75] text-slate-800 shadow-inner transition-all duration-150 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-900/5"
              spellCheck
            />
          </div>
        </>
      )}
    </section>
  );
}

function ActionButton({
  label,
  onClick,
  disabled,
  active,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 ${
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      {label}
    </button>
  );
}
