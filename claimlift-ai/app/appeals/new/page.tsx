"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import CheckboxGroup from "@/components/CheckboxGroup";
import ClaimAnalysisCard from "@/components/ClaimAnalysisCard";
import DenialUploadCard from "@/components/DenialUploadCard";
import FormInput from "@/components/FormInput";
import TextArea from "@/components/TextArea";
import { extractionToForm } from "@/lib/extractDenial";
import { documentOptions, insuranceOptions } from "@/lib/mockData";
import type {
  AppealFormData,
  ExtractDenialApiResponse,
  GenerateAppealApiResponse,
} from "@/lib/types";
import { formToApiRequest } from "@/lib/types";

const FORM_STORAGE_KEY = "claimlift:appeal";
const RESULT_STORAGE_KEY = "claimlift:result";
const ANALYSIS_STORAGE_KEY = "claimlift:analysis";

const initialForm: AppealFormData = {
  patientId: "DEMO-10293",
  insurance: "Delta Dental",
  procedureCode: "D2740",
  treatmentDate: "2026-06-01",
  deniedAmount: "1180",
  denialReason: "Missing pre-treatment radiographs",
  eobText:
    "Claim denied. Procedure not payable without supporting pre-treatment radiographs and narrative of necessity. (Demo EOB text.)",
  clinicalNotes:
    "Tooth #14 with extensive prior restoration and recurrent decay; crown indicated to restore function and prevent fracture. (Demo note.)",
  documents: ["Treatment Plan", "EOB"],
};

function FormSection({
  step,
  title,
  description,
  children,
}: {
  step: number;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
      <div className="flex items-start gap-3.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-sm font-semibold text-white">
          {step}
        </span>
        <div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {description && (
            <p className="mt-0.5 text-sm text-slate-500">{description}</p>
          )}
        </div>
      </div>
      <div className="mt-6">{children}</div>
    </div>
  );
}

export default function NewAppealPage() {
  const router = useRouter();
  const formSectionRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState<AppealFormData>(initialForm);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ExtractDenialApiResponse | null>(
    null
  );
  const [formRevealed, setFormRevealed] = useState(false);

  const showAppealForm = !analysis || formRevealed;

  const update = <K extends keyof AppealFormData>(
    key: K,
    value: AppealFormData[K]
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleExtracted = (result: ExtractDenialApiResponse) => {
    setForm((prev) => extractionToForm(result, prev));
    setAnalysis(result);
    setFormRevealed(false);
    setError(null);
  };

  const handleUploadReset = () => {
    setAnalysis(null);
    setFormRevealed(false);
  };

  const handleProceedToForm = () => {
    setFormRevealed(true);
    requestAnimationFrame(() => {
      formSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/generate-appeal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formToApiRequest(form)),
      });

      const data = (await res.json()) as GenerateAppealApiResponse & {
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to generate appeal packet.");
      }

      sessionStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(form));
      sessionStorage.setItem(RESULT_STORAGE_KEY, JSON.stringify(data));
      if (analysis) {
        sessionStorage.setItem(ANALYSIS_STORAGE_KEY, JSON.stringify(analysis));
      } else {
        sessionStorage.removeItem(ANALYSIS_STORAGE_KEY);
      }
      router.push("/appeals/result");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-12">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Create a new appeal packet.
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-500">
            Upload a denial letter or EOB for AI claim analysis, review the
            report, then edit the appeal form before generating your packet.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {analysis && (
            <Badge tone="blue" dot>
              Analysis complete
            </Badge>
          )}
          {formRevealed && (
            <Badge tone="green" dot>
              Form ready
            </Badge>
          )}
          <Badge tone="slate" dot>
            Demo mode
          </Badge>
        </div>
      </div>

      {/* Demo-data reminder */}
      <div className="mt-6 flex items-start gap-3 rounded-xl border border-blue-200/70 bg-blue-50/60 px-4 py-3 text-sm text-blue-800">
        <svg className="mt-0.5 shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5M12 8h.01" strokeLinecap="round" />
        </svg>
        <p>
          Use <span className="font-semibold">fake or redacted data only</span>.
          Never enter real patient information — this is a demonstration tool.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <svg className="mt-0.5 shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
          </svg>
          <div>
            <p className="font-medium">Could not generate appeal packet</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      <div className="mt-8">
        <DenialUploadCard
          onExtracted={handleExtracted}
          onExtractingChange={setExtracting}
          onReset={handleUploadReset}
          disabled={loading}
          compactSuccess={!!analysis}
        />
      </div>

      {analysis && (
        <div className="mt-8">
          <ClaimAnalysisCard
            analysis={analysis}
            onGenerateClick={handleProceedToForm}
            generating={loading}
          />
        </div>
      )}

      {showAppealForm && (
      <div ref={formSectionRef} className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
      <form onSubmit={handleSubmit}>
        <fieldset disabled={loading || extracting} className="flex flex-col gap-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {analysis ? "Step 3 — Review & complete" : "Appeal details"}
          </p>
          <FormSection
            step={1}
            title="Claim Details"
            description="Basic information about the denied claim."
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <FormInput
                label="Demo Patient ID"
                name="patientId"
                placeholder="DEMO-00000"
                value={form.patientId}
                onChange={(e) => update("patientId", e.target.value)}
                required
              />
              <FormInput
                label="Insurance Company"
                name="insurance"
                options={insuranceOptions}
                value={form.insurance}
                onChange={(e) => update("insurance", e.target.value)}
              />
              <FormInput
                label="Procedure Code"
                name="procedureCode"
                placeholder="e.g. D2740"
                value={form.procedureCode}
                onChange={(e) => update("procedureCode", e.target.value)}
                required
              />
              <FormInput
                label="Treatment Date"
                name="treatmentDate"
                type="date"
                value={form.treatmentDate}
                onChange={(e) => update("treatmentDate", e.target.value)}
              />
            </div>
          </FormSection>

          <FormSection
            step={2}
            title="Denial Information"
            description="What the payer said and why the claim was denied."
          >
            <div className="flex flex-col gap-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <FormInput
                  label="Denied Amount (USD)"
                  name="deniedAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.deniedAmount}
                  onChange={(e) => update("deniedAmount", e.target.value)}
                />
                <FormInput
                  label="Denial Reason"
                  name="denialReason"
                  placeholder="e.g. Missing radiographs"
                  value={form.denialReason}
                  onChange={(e) => update("denialReason", e.target.value)}
                  required
                />
              </div>
              <TextArea
                label="EOB / Denial Text"
                name="eobText"
                rows={4}
                placeholder="Paste the explanation of benefits or denial text (demo data only)..."
                hint="Demo or redacted text only."
                value={form.eobText}
                onChange={(e) => update("eobText", e.target.value)}
              />
            </div>
          </FormSection>

          <FormSection
            step={3}
            title="Clinical Documentation"
            description="Context the AI turns into a narrative of necessity."
          >
            <TextArea
              label="Clinical Notes"
              name="clinicalNotes"
              rows={5}
              placeholder="Relevant clinical context supporting necessity (demo data only)..."
              hint="Demo or redacted notes only — no real patient information."
              value={form.clinicalNotes}
              onChange={(e) => update("clinicalNotes", e.target.value)}
            />
          </FormSection>

          <FormSection
            step={4}
            title="Supporting Attachments"
            description="Select everything already on file. Anything unchecked is flagged in the packet."
          >
            <CheckboxGroup
              options={documentOptions}
              selected={form.documents}
              onChange={(docs) => update("documents", docs)}
            />
          </FormSection>

          <div className="sticky bottom-4 z-10 mt-2 flex flex-col items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm backdrop-blur sm:flex-row">
            <p className="text-xs text-slate-500">
              Powered by Claude when configured. Human review required before
              submission.
            </p>
            <Button
              type="submit"
              size="lg"
              disabled={loading}
              className="w-full sm:w-auto"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Generating…
                </span>
              ) : (
                "Generate Appeal Packet"
              )}
            </Button>
          </div>
        </fieldset>
      </form>

        <aside>
          <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-200/80">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 .9-1 1.7M12 17h.01" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="12" r="9" />
                </svg>
              </span>
              Best results include:
            </p>
            <ul className="mt-4 flex flex-col gap-3 text-sm text-slate-600">
              {[
                "Upload denial letter or EOB first",
                "EOB denial reason",
                "Procedure code",
                "Clinical notes",
                "X-rays or perio charting if available",
                "Existing narrative if available",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-5 border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-400">
              The more context you provide, the stronger the generated appeal
              packet. Use demo or redacted data only.
            </p>
          </div>
        </aside>
      </div>
      )}
    </main>
  );
}
