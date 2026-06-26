import { generateMockAppeal } from "@/lib/generateAppeal";
import type {
  AppealFormData,
  GeneratedAppeal,
  GenerateAppealApiResponse,
} from "@/lib/types";

export const WORKSPACE_AUTOSAVE_KEY = "claimlift:workspace:draft";
export const WORKSPACE_AUTOSAVE_MS = 3000;

export type WorkspaceSectionId =
  | "appealLetter"
  | "missingDocuments"
  | "clinicalNarrative"
  | "resubmissionChecklist"
  | "payerCallScript"
  | "internalBillingNote";

export interface WorkspaceContent {
  appealLetter: string;
  missingDocuments: string;
  clinicalNarrative: string;
  resubmissionChecklist: string;
  payerCallScript: string;
  internalBillingNote: string;
}

export interface WorkspaceDraft {
  content: WorkspaceContent;
  original: WorkspaceContent;
  form: AppealFormData;
  source: GenerateAppealApiResponse["source"];
  confidenceScore: string;
  riskWarnings: string[];
  updatedAt: string;
}

export const WORKSPACE_SECTIONS: {
  id: WorkspaceSectionId;
  title: string;
  description: string;
  rows: number;
}[] = [
  {
    id: "appealLetter",
    title: "Appeal Letter",
    description: "Ready to place on practice letterhead.",
    rows: 14,
  },
  {
    id: "missingDocuments",
    title: "Missing Documentation",
    description: "Attach these before resubmitting.",
    rows: 8,
  },
  {
    id: "clinicalNarrative",
    title: "Clinical Narrative",
    description: "Supports medical/dental necessity.",
    rows: 10,
  },
  {
    id: "resubmissionChecklist",
    title: "Resubmission Checklist",
    description: "Steps to complete before sending.",
    rows: 8,
  },
  {
    id: "payerCallScript",
    title: "Payer Call Script",
    description: "Use when calling the insurer.",
    rows: 10,
  },
  {
    id: "internalBillingNote",
    title: "Internal Billing Note",
    description: "For your team — not sent to the payer.",
    rows: 6,
  },
];

export function linesToArray(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);
}

export function arrayToLines(items: string[]): string {
  return items.map((item) => `• ${item}`).join("\n");
}

export function appealToWorkspace(result: GeneratedAppeal): WorkspaceContent {
  return {
    appealLetter: result.appealLetter,
    missingDocuments: arrayToLines(result.missingDocuments),
    clinicalNarrative: result.clinicalNarrative,
    resubmissionChecklist: arrayToLines(result.resubmissionChecklist),
    payerCallScript: result.payerCallScript,
    internalBillingNote: result.internalBillingNote,
  };
}

export function workspaceToAppeal(
  content: WorkspaceContent,
  base: GeneratedAppeal
): GeneratedAppeal {
  return {
    ...base,
    appealLetter: content.appealLetter,
    missingDocuments: linesToArray(content.missingDocuments),
    clinicalNarrative: content.clinicalNarrative,
    resubmissionChecklist: linesToArray(content.resubmissionChecklist),
    payerCallScript: content.payerCallScript,
    internalBillingNote: content.internalBillingNote,
  };
}

export function workspaceToApiResponse(
  content: WorkspaceContent,
  base: GenerateAppealApiResponse
): GenerateAppealApiResponse {
  return {
    ...workspaceToAppeal(content, base),
    source: base.source,
  };
}

export function createWorkspaceDraft(
  form: AppealFormData,
  result: GenerateAppealApiResponse
): WorkspaceDraft {
  const content = appealToWorkspace(result);
  return {
    content,
    original: { ...content },
    form,
    source: result.source,
    confidenceScore: result.confidenceScore,
    riskWarnings: result.riskWarnings,
    updatedAt: new Date().toISOString(),
  };
}

export function loadWorkspaceDraft(): WorkspaceDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(WORKSPACE_AUTOSAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as WorkspaceDraft;
  } catch {
    return null;
  }
}

export function saveWorkspaceDraft(draft: WorkspaceDraft): void {
  if (typeof window === "undefined") return;
  draft.updatedAt = new Date().toISOString();
  localStorage.setItem(WORKSPACE_AUTOSAVE_KEY, JSON.stringify(draft));
}

export function regenerateSection(
  sectionId: WorkspaceSectionId,
  form: AppealFormData
): string {
  const mock = generateMockAppeal(form);
  const fresh = appealToWorkspace(mock);
  return fresh[sectionId];
}

export function buildFullPacketText(
  content: WorkspaceContent,
  meta: { patientId: string; insurance: string; procedureCode: string }
): string {
  const blocks = WORKSPACE_SECTIONS.map((section) => {
    const body = content[section.id];
    return `${section.title.toUpperCase()}\n${"—".repeat(40)}\n${body}`;
  });

  return [
    "QUICKCLAIM AI — APPEAL PACKET (DEMO)",
    `Patient: ${meta.patientId}`,
    `Insurance: ${meta.insurance}`,
    `Procedure: ${meta.procedureCode}`,
    "",
    ...blocks,
  ].join("\n\n");
}

export function formatSavedLabel(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 5) return "Saved just now";
  if (seconds < 60) return `Saved ${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Saved ${minutes}m ago`;
  return `Saved at ${date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

export function openPacketPdfPrint(
  content: WorkspaceContent,
  meta: {
    patientId: string;
    insurance: string;
    procedureCode: string;
    deniedAmount: string;
  }
): void {
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Appeal Packet — ${meta.patientId}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: Georgia, "Times New Roman", serif;
      color: #0f172a;
      line-height: 1.65;
      max-width: 720px;
      margin: 0 auto;
      padding: 48px 40px;
    }
    h1 { font-size: 20px; font-weight: 600; margin: 0 0 8px; letter-spacing: -0.02em; }
    .meta { font-size: 13px; color: #475569; margin-bottom: 32px; font-family: system-ui, sans-serif; }
    h2 {
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #64748b;
      margin: 28px 0 10px;
      font-family: system-ui, sans-serif;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 6px;
    }
    .body { font-size: 14px; white-space: pre-wrap; }
    .footer {
      margin-top: 40px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
      font-size: 11px;
      color: #94a3b8;
      font-family: system-ui, sans-serif;
    }
    @media print { body { padding: 24px; } }
  </style>
</head>
<body>
  <h1>Appeal Packet</h1>
  <p class="meta">
    ${meta.patientId} · ${meta.insurance} · ${meta.procedureCode}<br />
    Denied amount: $${meta.deniedAmount} · Demo document — human review required
  </p>
  ${WORKSPACE_SECTIONS.map(
    (s) =>
      `<h2>${s.title}</h2><div class="body">${escapeHtml(content[s.id])}</div>`
  ).join("")}
  <p class="footer">QuickClaim AI — Billing workflow support only. Not a guarantee of reimbursement.</p>
  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`;

  const win = window.open("", "_blank", "noopener,noreferrer");
  if (!win) return;
  win.document.write(html);
  win.document.close();
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
