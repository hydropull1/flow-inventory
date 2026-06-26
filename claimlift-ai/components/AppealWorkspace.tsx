"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import WorkspaceSection from "@/components/WorkspaceSection";
import { deriveStatus } from "@/lib/savedAppeals";
import type {
  AppealFormData,
  ExtractDenialApiResponse,
  GenerateAppealApiResponse,
} from "@/lib/types";
import {
  WORKSPACE_AUTOSAVE_MS,
  WORKSPACE_SECTIONS,
  appealToWorkspace,
  buildFullPacketText,
  createWorkspaceDraft,
  formatSavedLabel,
  loadWorkspaceDraft,
  regenerateSection,
  saveWorkspaceDraft,
  workspaceToApiResponse,
  type WorkspaceContent,
  type WorkspaceSectionId,
} from "@/lib/workspace";
import { downloadAppealPdf, printAppealPdf } from "@/lib/appealPdf";
import { statusTone } from "@/components/AppealPacket";

const PDF_STEPS = [
  "Preparing Appeal Packet...",
  "Formatting PDF...",
  "Finalizing document...",
] as const;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const FORM_STORAGE_KEY = "claimlift:appeal";
const RESULT_STORAGE_KEY = "claimlift:result";

const sectionIcons: Record<WorkspaceSectionId, React.ReactNode> = {
  appealLetter: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 5h16v14H4z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 7l8 5 8-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  missingDocuments: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 11l3 3 8-8M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  clinicalNarrative: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 6h16M4 12h16M4 18h10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  resubmissionChecklist: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 5h11M9 12h11M9 19h11M4 5h.01M4 12h.01M4 19h.01" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  payerCallScript: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8 9.6a16 16 0 0 0 6 6l1.2-1.1a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  internalBillingNote: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 3v4a1 1 0 0 0 1 1h4M5 3h9l5 5v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

function usd(raw: string) {
  const n = parseFloat(raw);
  if (!raw || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

interface AppealWorkspaceProps {
  form: AppealFormData;
  result: GenerateAppealApiResponse;
  analysis?: ExtractDenialApiResponse | null;
  savedId: string | null;
  onSaveToDashboard: (content: WorkspaceContent) => string;
}

export default function AppealWorkspace({
  form,
  result,
  analysis = null,
  savedId,
  onSaveToDashboard,
}: AppealWorkspaceProps) {
  const initial = appealToWorkspace(result);
  const [content, setContent] = useState<WorkspaceContent>(initial);
  const [original, setOriginal] = useState<WorkspaceContent>({ ...initial });
  const [riskWarnings] = useState(result.riskWarnings);
  const [regeneratingId, setRegeneratingId] = useState<WorkspaceSectionId | null>(
    null
  );
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveLabel, setSaveLabel] = useState<string | null>(null);
  const [copiedPacket, setCopiedPacket] = useState(false);
  const [dashboardSavedId, setDashboardSavedId] = useState(savedId);
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(
    savedId ? JSON.stringify(initial) : null
  );
  const [showToast, setShowToast] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfStep, setPdfStep] = useState(0);
  const dirtyRef = useRef(false);
  const generateRef = useRef<HTMLDivElement>(null);

  const status = deriveStatus(result);

  // The appeal is "saved to dashboard" only when a record exists AND the
  // current edited content matches what was last pushed to the dashboard.
  const isSavedToDashboard =
    !!dashboardSavedId && savedSnapshot === JSON.stringify(content);

  const persistDraft = useCallback(
    (nextContent: WorkspaceContent, showLabel = false) => {
      const draft = createWorkspaceDraft(form, result);
      draft.content = nextContent;
      draft.original = original;
      draft.riskWarnings = riskWarnings;
      saveWorkspaceDraft(draft);
      sessionStorage.setItem(
        RESULT_STORAGE_KEY,
        JSON.stringify(workspaceToApiResponse(nextContent, result))
      );
      sessionStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(form));
      const now = new Date();
      setLastSaved(now);
      if (showLabel) setSaveLabel(formatSavedLabel(now));
      dirtyRef.current = false;
    },
    [form, original, result, riskWarnings]
  );

  // Load autosaved draft if it matches current session
  useEffect(() => {
    const draft = loadWorkspaceDraft();
    if (
      draft &&
      draft.form.patientId === form.patientId &&
      draft.form.procedureCode === form.procedureCode &&
      draft.form.denialReason === form.denialReason
    ) {
      setContent(draft.content);
      setOriginal(draft.original);
      setLastSaved(new Date(draft.updatedAt));
      setSaveLabel(formatSavedLabel(new Date(draft.updatedAt)));
    }
  }, [form.patientId, form.procedureCode, form.denialReason]);

  // Autosave interval
  useEffect(() => {
    const interval = setInterval(() => {
      if (!dirtyRef.current) return;
      persistDraft(content);
      setSaveLabel("Saved just now");
    }, WORKSPACE_AUTOSAVE_MS);
    return () => clearInterval(interval);
  }, [content, persistDraft]);

  // Update save label recency
  useEffect(() => {
    if (!lastSaved) return;
    const tick = setInterval(() => {
      setSaveLabel(formatSavedLabel(lastSaved));
    }, 10000);
    return () => clearInterval(tick);
  }, [lastSaved]);

  // Ctrl+S → explicit Save to Dashboard (user confirmation)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSaveToDashboard();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, dashboardSavedId, savedSnapshot]);

  // Close the Generate menu when clicking outside
  useEffect(() => {
    if (!generateOpen) return;
    const onClick = (e: MouseEvent) => {
      if (
        generateRef.current &&
        !generateRef.current.contains(e.target as Node)
      ) {
        setGenerateOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [generateOpen]);

  const updateSection = (id: WorkspaceSectionId, value: string) => {
    dirtyRef.current = true;
    setContent((prev) => ({ ...prev, [id]: value }));
  };

  const handleSaveToDashboard = () => {
    if (isSavedToDashboard) return;
    // Persist the local draft, then commit the CURRENT edited content to the
    // dashboard (autosave never does this on its own).
    persistDraft(content, true);
    const id = onSaveToDashboard(content);
    setDashboardSavedId(id);
    setSavedSnapshot(JSON.stringify(content));
    setShowToast(true);
    window.setTimeout(() => setShowToast(false), 3000);
  };

  const handleCopyPacket = async () => {
    const text = buildFullPacketText(content, {
      patientId: form.patientId,
      insurance: form.insurance,
      procedureCode: form.procedureCode,
    });
    try {
      await navigator.clipboard.writeText(text);
      setCopiedPacket(true);
      setTimeout(() => setCopiedPacket(false), 2000);
    } catch {
      setCopiedPacket(false);
    }
  };

  const runPdf = async (action: "download" | "print") => {
    setGenerateOpen(false);
    setPdfBusy(true);
    setPdfStep(0);
    await wait(650);
    setPdfStep(1);
    await wait(650);
    setPdfStep(2);
    await wait(550);
    const input = { content, form, result, analysis };
    try {
      if (action === "download") {
        downloadAppealPdf(input);
      } else {
        printAppealPdf(input);
      }
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      await wait(450);
      setPdfBusy(false);
    }
  };

  const handleCopyFromMenu = () => {
    setGenerateOpen(false);
    void handleCopyPacket();
  };

  const handleRegenerate = async (id: WorkspaceSectionId) => {
    setRegeneratingId(id);
    await new Promise((r) => setTimeout(r, 600));
    const fresh = regenerateSection(id, form);
    setContent((prev) => ({ ...prev, [id]: fresh }));
    setOriginal((prev) => ({ ...prev, [id]: fresh }));
    dirtyRef.current = true;
    setRegeneratingId(null);
  };

  const handleReset = (id: WorkspaceSectionId) => {
    setContent((prev) => ({ ...prev, [id]: original[id] }));
    dirtyRef.current = true;
  };

  const editedCount = WORKSPACE_SECTIONS.filter(
    (s) => content[s.id] !== original[s.id]
  ).length;

  return (
    <div className="flex flex-col gap-6">
      {/* Sticky action bar */}
      <div className="sticky top-14 z-30 -mx-6 border-b border-slate-200 bg-white/95 px-6 py-3 shadow-sm backdrop-blur-md sm:-mx-0 sm:rounded-xl sm:border sm:shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <p className="text-sm font-semibold text-slate-900">
              Appeal Workspace
            </p>
            {saveLabel && (
              <span className="text-xs text-slate-500">{saveLabel}</span>
            )}
            {editedCount > 0 && (
              <Badge tone="amber">{editedCount} edited</Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isSavedToDashboard ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-sm font-medium text-emerald-700">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Saved to Dashboard
              </span>
            ) : (
              <Button type="button" size="sm" onClick={handleSaveToDashboard}>
                Save to Dashboard
              </Button>
            )}
            <div ref={generateRef} className="relative">
              <Button
                type="button"
                size="sm"
                onClick={() => setGenerateOpen((v) => !v)}
                disabled={pdfBusy}
              >
                <span className="flex items-center gap-1.5">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 3v4a1 1 0 0 0 1 1h4M5 3h9l5 5v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Generate Appeal Packet
                  <svg className={`transition-transform ${generateOpen ? "rotate-180" : ""}`} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </Button>
              {generateOpen && (
                <div className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg">
                  <MenuItem
                    label="Download PDF"
                    description="Save the polished packet"
                    onClick={() => void runPdf("download")}
                    icon={
                      <path d="M12 3v12M8 11l4 4 4-4M5 19h14" strokeLinecap="round" strokeLinejoin="round" />
                    }
                  />
                  <MenuItem
                    label="Print Packet"
                    description="Open the print dialog"
                    onClick={() => void runPdf("print")}
                    icon={
                      <path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M6 14h12v7H6z" strokeLinecap="round" strokeLinejoin="round" />
                    }
                  />
                  <MenuItem
                    label={copiedPacket ? "Copied!" : "Copy Entire Packet"}
                    description="Copy all sections as text"
                    onClick={handleCopyFromMenu}
                    icon={
                      <>
                        <rect x="9" y="9" width="11" height="11" rx="2" />
                        <path d="M5 15V5a2 2 0 0 1 2-2h10" strokeLinecap="round" />
                      </>
                    }
                  />
                </div>
              )}
            </div>
            <Button href="/dashboard" size="sm" variant="secondary">
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>

      {/* Document header */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                Appeal Packet · {form.patientId}
              </p>
              <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight text-slate-900">
                {form.insurance} — Procedure {form.procedureCode}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Denial: {form.denialReason || "—"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {result.source === "claude" ? (
                <Badge tone="blue" dot>
                  Generated by Claude
                </Badge>
              ) : (
                <Badge tone="slate" dot>
                  Demo mode
                </Badge>
              )}
              <Badge tone={statusTone[status]} dot>
                {status}
              </Badge>
            </div>
          </div>
        </div>
        <div className="grid gap-px bg-slate-100 sm:grid-cols-4">
          {[
            { label: "Insurance", value: form.insurance },
            { label: "Procedure", value: form.procedureCode },
            { label: "Denied", value: usd(form.deniedAmount) },
            { label: "Confidence", value: result.confidenceScore },
          ].map((item) => (
            <div key={item.label} className="bg-white px-5 py-4">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                {item.label}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Human review banner */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200/80 bg-amber-50/70 px-5 py-4">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <div>
          <p className="text-sm font-semibold text-slate-900">
            Human Review Required
          </p>
          <p className="mt-0.5 text-sm leading-relaxed text-slate-600">
            This AI-generated appeal should be reviewed and approved before
            submission. A qualified billing professional must verify all
            clinical and financial details.
          </p>
        </div>
      </div>

      {dashboardSavedId && (
        <div
          role="status"
          className="flex flex-col items-start justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 sm:flex-row sm:items-center"
        >
          <p className="flex items-center gap-2 font-medium">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {isSavedToDashboard
              ? "This appeal is saved to your dashboard."
              : "Saved — you have unsaved edits. Click Save to Dashboard to update."}
          </p>
          <div className="flex gap-2">
            <Link
              href={`/appeals/${dashboardSavedId}`}
              className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
            >
              View saved appeal
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-700"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      )}

      {/* Editable document sections */}
      <div className="flex flex-col gap-4">
        {WORKSPACE_SECTIONS.map((section, index) => (
          <WorkspaceSection
            key={section.id}
            id={section.id}
            title={section.title}
            description={section.description}
            icon={sectionIcons[section.id]}
            value={content[section.id]}
            original={original[section.id]}
            rows={section.rows}
            onChange={(v) => updateSection(section.id, v)}
            onCopy={() => {}}
            onRegenerate={() => void handleRegenerate(section.id)}
            onReset={() => handleReset(section.id)}
            regenerating={regeneratingId === section.id}
            defaultExpanded={index < 2}
          />
        ))}
      </div>

      {/* Risk warnings — read only */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-100">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          Risk warnings
        </p>
        <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {riskWarnings.map((w, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              {w}
            </li>
          ))}
        </ul>
      </div>

      <p className="text-center text-xs leading-relaxed text-slate-400">
        QuickClaim AI is for billing workflow support only. Demo data only. Press{" "}
        <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px]">
          Ctrl+S
        </kbd>{" "}
        to save to dashboard.
      </p>

      {/* PDF generation overlay */}
      {pdfBusy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="w-[320px] rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-xl">
            <svg className="mx-auto h-10 w-10 animate-spin text-blue-600" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="mt-5 text-base font-semibold tracking-tight text-slate-900">
              {PDF_STEPS[pdfStep]}
            </p>
            <p className="mt-1.5 text-sm text-slate-500">
              Building your submission-ready Appeal Packet.
            </p>
            <div className="mt-5 flex justify-center gap-1.5">
              {PDF_STEPS.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 w-8 rounded-full transition-colors duration-300 ${
                    i <= pdfStep ? "bg-blue-600" : "bg-slate-200"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Success toast */}
      {showToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2.5 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-lg"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          Appeal saved successfully.
        </div>
      )}
    </div>
  );
}

function MenuItem({
  label,
  description,
  onClick,
  icon,
}: {
  label: string;
  description: string;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-slate-50"
    >
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {icon}
        </svg>
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-slate-900">{label}</span>
        <span className="block text-xs text-slate-500">{description}</span>
      </span>
    </button>
  );
}
