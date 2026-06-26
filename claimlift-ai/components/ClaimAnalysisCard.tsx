"use client";

import Badge, { type BadgeTone } from "@/components/Badge";
import Button from "@/components/Button";
import {
  formatDisplayAmount,
  formatDisplayDate,
} from "@/lib/extractDenial";
import type {
  AppealReadinessLevel,
  DenialCategory,
  ExtractDenialApiResponse,
} from "@/lib/types";

const readinessTone: Record<
  AppealReadinessLevel,
  { badge: BadgeTone; bar: string; text: string }
> = {
  High: { badge: "green", bar: "bg-emerald-500", text: "text-emerald-700" },
  Medium: { badge: "amber", bar: "bg-amber-500", text: "text-amber-700" },
  Low: { badge: "red", bar: "bg-red-500", text: "text-red-700" },
};

const categoryTone: Record<DenialCategory, BadgeTone> = {
  "Medical Necessity": "indigo",
  "Missing Documentation": "amber",
  "Frequency Limitation": "blue",
  "Benefit Exclusion": "red",
  "Waiting Period": "slate",
  "Coordination of Benefits": "indigo",
  Other: "slate",
};

function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="border-b border-slate-100 px-6 py-4">
      <h3 className="text-sm font-semibold tracking-tight text-slate-900">
        {title}
      </h3>
      {subtitle && (
        <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
      )}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface ClaimAnalysisCardProps {
  analysis: ExtractDenialApiResponse;
  onGenerateClick: () => void;
  generating?: boolean;
}

export default function ClaimAnalysisCard({
  analysis,
  onGenerateClick,
  generating = false,
}: ClaimAnalysisCardProps) {
  const readiness = readinessTone[analysis.appealReadiness.level];
  const readinessWidth =
    analysis.appealReadiness.level === "High"
      ? "85%"
      : analysis.appealReadiness.level === "Medium"
        ? "55%"
        : "28%";

  const summaryRows = [
    { label: "Insurance Company", value: analysis.insuranceCompany || "—" },
    { label: "Patient", value: analysis.patientName || "—" },
    {
      label: "Procedure Code(s)",
      value:
        analysis.procedureCodes.length > 0
          ? analysis.procedureCodes.join(", ")
          : "—",
    },
    {
      label: "Date of Service",
      value: formatDisplayDate(analysis.treatmentDate),
    },
    {
      label: "Denied Amount",
      value: formatDisplayAmount(analysis.deniedAmount),
      highlight: true,
    },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Report header */}
      <div className="border-b border-slate-200 bg-slate-900 px-6 py-5 text-white sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-300">
              Step 2 — AI Claim Analysis
            </p>
            <h2 className="mt-1.5 text-xl font-semibold tracking-tight">
              Denial Review Report
            </h2>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-300">
              AI analysis of the uploaded denial document. Review findings
              before proceeding to the editable appeal form.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white ring-1 ring-inset ring-white/20">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
              {analysis.source === "claude"
                ? "Analyzed by Claude"
                : "Demo analysis"}
            </span>
            <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-slate-200 ring-1 ring-inset ring-white/20">
              Extraction {analysis.confidenceScore}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-px bg-slate-100 lg:grid-cols-2">
        {/* Document Summary */}
        <div className="bg-white">
          <SectionHeader title="Document Summary" />
          <dl className="divide-y divide-slate-100 px-6">
            {summaryRows.map((row) => (
              <div
                key={row.label}
                className="flex items-baseline justify-between gap-4 py-3.5"
              >
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  {row.label}
                </dt>
                <dd
                  className={`text-right text-sm font-medium ${
                    row.highlight ? "text-slate-900" : "text-slate-700"
                  }`}
                >
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
          {analysis.denialReason && (
            <div className="border-t border-slate-100 px-6 py-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Denial reason
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                {analysis.denialReason}
              </p>
            </div>
          )}
        </div>

        {/* Appeal Readiness + Category */}
        <div className="bg-white">
          <SectionHeader
            title="Appeal Readiness"
            subtitle="Estimated preparedness — not a guarantee of approval"
          />
          <div className="px-6 py-5">
            <div className="flex items-center gap-3">
              <span
                className={`text-2xl font-semibold tracking-tight ${readiness.text}`}
              >
                {analysis.appealReadiness.level}
              </span>
              <Badge tone={readiness.badge} dot>
                Readiness
              </Badge>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all duration-500 ${readiness.bar}`}
                style={{ width: readinessWidth }}
              />
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              {analysis.appealReadiness.explanation}
            </p>

            <div className="mt-6 border-t border-slate-100 pt-5">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Denial category
              </p>
              <div className="mt-2">
                <Badge tone={categoryTone[analysis.denialCategory]} dot>
                  {analysis.denialCategory}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* AI Findings */}
        <div className="bg-white">
          <SectionHeader title="AI Findings" />
          <ul className="space-y-3 px-6 py-5">
            {(analysis.aiFindings.length > 0
              ? analysis.aiFindings
              : ["Document processed — review extracted fields manually"]
            ).map((finding) => (
              <li key={finding} className="flex items-start gap-2.5 text-sm">
                <CheckIcon />
                <span className="text-slate-700">{finding}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Missing Documentation */}
        <div className="bg-white">
          <SectionHeader
            title="Missing Documentation"
            subtitle="Likely items needed based on denial language"
          />
          {analysis.missingDocumentation.length > 0 ? (
            <ul className="space-y-2.5 px-6 py-5">
              {analysis.missingDocumentation.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 rounded-lg border border-amber-100 bg-amber-50/60 px-3.5 py-2.5 text-sm text-slate-700"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-6 py-5 text-sm text-slate-500">
              No specific missing documentation identified. Review the denial
              text manually.
            </p>
          )}
        </div>
      </div>

      {/* Recommended Next Steps — full width */}
      <div className="border-t border-slate-200 bg-white">
        <SectionHeader title="Recommended Next Steps" />
        <ol className="grid gap-3 px-6 py-5 sm:grid-cols-2">
          {analysis.recommendedNextSteps.map((step, i) => (
            <li
              key={step}
              className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3.5"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                {i + 1}
              </span>
              <span className="text-sm leading-relaxed text-slate-700">
                {step}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {/* CTA */}
      <div className="border-t border-slate-200 bg-slate-50/80 px-6 py-6 sm:px-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <p className="max-w-md text-sm text-slate-600">
            Continue to the editable appeal form to review extracted details,
            add clinical notes, and generate your appeal packet.
          </p>
          <Button
            type="button"
            size="lg"
            disabled={generating}
            onClick={onGenerateClick}
            className="w-full shrink-0 sm:w-auto"
          >
            Generate Appeal Packet
          </Button>
        </div>
      </div>
    </div>
  );
}
