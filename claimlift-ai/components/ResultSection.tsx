"use client";

import { useState, type ReactNode } from "react";

interface ResultSectionProps {
  title: string;
  description?: string;
  copyText: string;
  icon?: ReactNode;
  children: ReactNode;
}

export default function ResultSection({
  title,
  description,
  copyText,
  icon,
  children,
}: ResultSectionProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-slate-50/50 px-6 py-4">
        <div className="flex items-start gap-3">
          {icon && (
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 ring-1 ring-inset ring-slate-200/80">
              {icon}
            </span>
          )}
          <div>
            <h3 className="text-[15px] font-semibold tracking-tight text-slate-900">
              {title}
            </h3>
            {description && (
              <p className="mt-0.5 text-sm text-slate-500">{description}</p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={`Copy ${title}`}
          className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all duration-150 active:scale-[0.97] ${
            copied
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50 hover:text-slate-900"
          }`}
        >
          {copied ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="11" height="11" rx="2" />
              <path d="M5 15V5a2 2 0 0 1 2-2h10" strokeLinecap="round" />
            </svg>
          )}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="px-6 py-5 text-sm leading-relaxed text-slate-600">
        {children}
      </div>
    </section>
  );
}
