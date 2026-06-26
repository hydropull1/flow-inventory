"use client";

import { useEffect, useMemo, useState } from "react";
import AppealTable from "@/components/AppealTable";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import StatCard from "@/components/StatCard";
import { clearSavedAppeals, getSavedAppeals } from "@/lib/savedAppeals";
import { parseConfidenceScore, type SavedAppeal } from "@/lib/types";

const usd = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

const FILTERS = ["All", "Generated", "Needs Review"] as const;
type Filter = (typeof FILTERS)[number];

export default function DashboardPage() {
  const [appeals, setAppeals] = useState<SavedAppeal[]>([]);
  const [ready, setReady] = useState(false);
  const [filter, setFilter] = useState<Filter>("All");

  useEffect(() => {
    setAppeals(getSavedAppeals());
    setReady(true);
  }, []);

  const handleClear = () => {
    clearSavedAppeals();
    setAppeals([]);
    setFilter("All");
  };

  const deniedReviewed = appeals.reduce(
    (sum, a) => sum + (parseFloat(a.deniedAmount) || 0),
    0
  );
  const needsReview = appeals.filter((a) => a.status === "Needs Review").length;
  const avgConfidence = appeals.length
    ? Math.round(
        appeals.reduce(
          (sum, a) => sum + parseConfidenceScore(a.result.confidenceScore),
          0
        ) / appeals.length
      )
    : 0;

  const filtered = useMemo(
    () =>
      filter === "All"
        ? appeals
        : appeals.filter((a) => a.status === filter),
    [appeals, filter]
  );

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Dashboard
            </h1>
            <Badge tone="slate" dot>
              Demo mode
            </Badge>
          </div>
          <p className="mt-1.5 text-sm text-slate-500">
            Saved appeals live in your browser. No real patient data is stored.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Button
            type="button"
            variant="danger"
            onClick={handleClear}
            disabled={appeals.length === 0}
          >
            Clear Demo Data
          </Button>
          <Button href="/appeals/new">+ New Appeal</Button>
        </div>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total appeal drafts"
          value={String(appeals.length)}
          hint="Saved in this browser"
          icon={
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M9 12h6M9 16h6M9 8h6M5 4h14v16H5z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
        <StatCard
          label="Estimated denied revenue reviewed"
          value={usd(deniedReviewed)}
          hint="Across saved appeals"
          icon={
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
        <StatCard
          label="Needs review"
          value={String(needsReview)}
          hint="Awaiting human review"
          icon={
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
        <StatCard
          label="Average confidence"
          value={appeals.length ? `${avgConfidence}%` : "—"}
          hint="Across saved appeals"
          icon={
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M3 17l6-6 4 4 7-7M14 8h6v6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
      </div>

      <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">
          Saved appeal drafts
        </h2>
        {appeals.length > 0 && (
          <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-0.5 text-sm">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                  filter === f
                    ? "bg-slate-900 text-white"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4">
        {!ready ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-400 shadow-sm">
            Loading saved appeals…
          </div>
        ) : appeals.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 text-slate-400 ring-1 ring-inset ring-slate-200/80">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M14 3v4a1 1 0 0 0 1 1h4M5 3h9l5 5v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9 13h6M9 17h4" strokeLinecap="round" />
              </svg>
            </span>
            <h3 className="mt-5 text-base font-semibold text-slate-900">
              No saved appeals yet
            </h3>
            <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-slate-500">
              Generate your first appeal packet and save it here to build your
              demo dashboard.
            </p>
            <div className="mt-7">
              <Button href="/appeals/new">Generate your first appeal</Button>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500 shadow-sm">
            No appeals match the <span className="font-medium">{filter}</span>{" "}
            filter.
          </div>
        ) : (
          <AppealTable drafts={filtered} />
        )}
      </div>
    </main>
  );
}
