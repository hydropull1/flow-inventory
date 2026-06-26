import Link from "next/link";
import Badge from "@/components/Badge";
import { statusTone } from "@/components/AppealPacket";
import type { SavedAppeal } from "@/lib/types";
import { parseConfidenceScore } from "@/lib/types";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const usd = (raw: string) => {
  const n = parseFloat(raw);
  if (!raw || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
};

function confidenceBar(score: number) {
  if (score >= 75) return "bg-emerald-500";
  if (score >= 55) return "bg-blue-600";
  return "bg-amber-500";
}

export default function AppealTable({ drafts }: { drafts: SavedAppeal[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] uppercase tracking-wider text-slate-400">
              <th className="px-6 py-3 font-semibold">Demo Patient ID</th>
              <th className="px-6 py-3 font-semibold">Insurance</th>
              <th className="px-6 py-3 font-semibold">Procedure</th>
              <th className="px-6 py-3 font-semibold">Denied</th>
              <th className="px-6 py-3 font-semibold">Confidence</th>
              <th className="px-6 py-3 font-semibold">Status</th>
              <th className="px-6 py-3 font-semibold">Created</th>
              <th className="px-6 py-3 text-right font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {drafts.map((d) => {
              const confidence = parseConfidenceScore(d.result.confidenceScore);
              return (
                <tr key={d.id} className="transition-colors hover:bg-slate-50/80">
                  <td className="px-6 py-4 font-medium text-slate-900">
                    {d.patientId}
                  </td>
                  <td className="px-6 py-4 text-slate-600">{d.insurance}</td>
                  <td className="px-6 py-4">
                    <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs text-slate-700">
                      {d.procedureCode}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-semibold tabular-nums text-slate-900">
                    {usd(d.deniedAmount)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2.5">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${confidenceBar(confidence)}`}
                          style={{ width: `${Math.max(4, Math.min(100, confidence))}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium tabular-nums text-slate-600">
                        {confidence}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge tone={statusTone[d.status]} dot>
                      {d.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {formatDate(d.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/appeals/${d.id}`}
                      className="group/btn inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition-all duration-150 hover:border-slate-300 hover:bg-slate-50 active:scale-[0.97]"
                    >
                      View
                      <svg className="transition-transform duration-150 group-hover/btn:translate-x-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
