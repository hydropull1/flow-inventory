import { jsPDF } from "jspdf";
import type {
  AppealFormData,
  AppealReadinessLevel,
  ExtractDenialApiResponse,
  GenerateAppealApiResponse,
} from "@/lib/types";
import { parseConfidenceScore } from "@/lib/types";
import { linesToArray, type WorkspaceContent } from "@/lib/workspace";

export interface AppealPdfInput {
  content: WorkspaceContent;
  form: AppealFormData;
  result: GenerateAppealApiResponse;
  analysis: ExtractDenialApiResponse | null;
}

// ---- Page geometry (US Letter, millimetres) ---------------------------------
const PAGE_W = 215.9;
const PAGE_H = 279.4;
const MARGIN_X = 18;
const MARGIN_TOP = 20;
const MARGIN_BOTTOM = 18;
const CONTENT_W = PAGE_W - MARGIN_X * 2;
const FOOTER_Y = PAGE_H - 11;
const PT_TO_MM = 0.352778;

// ---- Palette ----------------------------------------------------------------
type RGB = [number, number, number];
const NAVY: RGB = [15, 23, 42];
const SLATE_700: RGB = [51, 65, 85];
const SLATE_600: RGB = [71, 85, 105];
const SLATE_500: RGB = [100, 116, 139];
const SLATE_400: RGB = [148, 163, 184];
const BLUE: RGB = [37, 99, 235];
const BORDER: RGB = [226, 232, 240];
const AMBER_BG: RGB = [255, 251, 235];
const AMBER_BORDER: RGB = [253, 230, 138];
const AMBER_TEXT: RGB = [146, 64, 14];
const EMERALD: RGB = [16, 185, 129];

const usd = (raw: string): string => {
  const n = parseFloat(String(raw).replace(/[^0-9.]/g, ""));
  if (!raw || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
};

const formatDate = (iso: string): string => {
  if (!iso?.trim()) return "—";
  const d = new Date(iso.includes("T") ? iso : `${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

function readinessLevel(input: AppealPdfInput): AppealReadinessLevel {
  if (input.analysis?.appealReadiness?.level) {
    return input.analysis.appealReadiness.level;
  }
  const score = parseConfidenceScore(input.result.confidenceScore);
  if (score >= 75) return "High";
  if (score >= 55) return "Medium";
  return "Low";
}

function assessmentText(level: AppealReadinessLevel): string {
  switch (level) {
    case "High":
      return "High — strong candidate for appeal";
    case "Medium":
      return "Medium — recommended with added documentation";
    default:
      return "Low — review carefully before appealing";
  }
}

function estimatedRecovery(amount: string, level: AppealReadinessLevel): string {
  const n = parseFloat(String(amount).replace(/[^0-9.]/g, ""));
  if (!amount || Number.isNaN(n) || n === 0) return "—";
  const ranges: Record<AppealReadinessLevel, [number, number]> = {
    High: [0.8, 1.0],
    Medium: [0.45, 0.7],
    Low: [0.15, 0.35],
  };
  const [lo, hi] = ranges[level];
  return `${usd(String(Math.round(n * lo)))} – ${usd(String(Math.round(n * hi)))}`;
}

function buildExecutiveSummary(input: AppealPdfInput): string {
  const { form, analysis } = input;
  const codes =
    analysis?.procedureCodes && analysis.procedureCodes.length > 0
      ? analysis.procedureCodes.join(", ")
      : form.procedureCode || "the submitted procedure";
  const insurance = form.insurance || "the payer";
  const reason = (form.denialReason || "").trim();
  const missing =
    linesToArray(input.content.missingDocuments).slice(0, 4);
  const level = readinessLevel(input);
  const explanation = analysis?.appealReadiness?.explanation?.trim();

  const parts: string[] = [];
  parts.push(
    `This claim for procedure ${codes} submitted to ${insurance} was denied${
      reason ? ` due to ${reason.toLowerCase().replace(/\.$/, "")}` : ""
    }.`
  );
  if (missing.length > 0) {
    parts.push(
      `The denial points to documentation gaps including ${missing.join(
        ", "
      )}.`
    );
  }
  parts.push(
    `Based on QuickClaim AI's analysis, this claim presents a ${level.toLowerCase()} likelihood of being suitable for appeal${
      explanation ? `: ${explanation.replace(/\.$/, "")}` : ""
    }.`
  );
  parts.push(
    "All materials must be verified by a qualified billing professional before submission."
  );
  return parts.join(" ");
}

function aiFindings(input: AppealPdfInput): string[] {
  if (input.analysis?.aiFindings && input.analysis.aiFindings.length > 0) {
    return input.analysis.aiFindings;
  }
  const findings = ["Claim information successfully extracted"];
  if (input.form.procedureCode) {
    findings.push(`Procedure ${input.form.procedureCode} identified`);
  }
  if (input.form.denialReason) {
    findings.push("Denial reason identified from claim details");
  }
  findings.push("Appeal packet drafted for billing review");
  return findings;
}

// ---- Layout engine ----------------------------------------------------------
class PdfBuilder {
  doc: jsPDF;
  y: number;
  private patientLabel: string;
  private insurance: string;

  constructor(patientLabel: string, insurance: string) {
    this.doc = new jsPDF({ unit: "mm", format: "letter", compress: true });
    this.y = MARGIN_TOP;
    this.patientLabel = patientLabel;
    this.insurance = insurance;
  }

  private fill(c: RGB) {
    this.doc.setFillColor(c[0], c[1], c[2]);
  }
  private stroke(c: RGB) {
    this.doc.setDrawColor(c[0], c[1], c[2]);
  }
  private color(c: RGB) {
    this.doc.setTextColor(c[0], c[1], c[2]);
  }
  private lh(sizePt: number, factor = 1.5) {
    return sizePt * PT_TO_MM * factor;
  }

  newPage() {
    this.doc.addPage();
    this.y = MARGIN_TOP;
  }

  ensure(height: number) {
    if (this.y + height > PAGE_H - MARGIN_BOTTOM) {
      this.newPage();
    }
  }

  gap(mm: number) {
    this.y += mm;
  }

  // ---- Cover / brand --------------------------------------------------------
  coverHeader(generatedDate: string) {
    const doc = this.doc;
    // Logo mark — navy rounded square with document + blue check
    const lx = MARGIN_X;
    const ly = 16;
    this.fill(NAVY);
    doc.roundedRect(lx, ly, 11, 11, 2.2, 2.2, "F");
    // document outline
    this.stroke([255, 255, 255]);
    doc.setLineWidth(0.4);
    doc.roundedRect(lx + 3, ly + 2.4, 5, 6.2, 0.6, 0.6, "S");
    // blue check
    this.stroke(BLUE);
    doc.setLineWidth(0.7);
    doc.line(lx + 4.2, ly + 6.1, lx + 5.2, ly + 7.1);
    doc.line(lx + 5.2, ly + 7.1, lx + 7.2, ly + 4.6);

    // Wordmark
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    this.color(NAVY);
    doc.text("QuickClaim", lx + 14.5, ly + 7.4);
    const w = doc.getTextWidth("QuickClaim ");
    this.color(BLUE);
    doc.text("AI", lx + 14.5 + w, ly + 7.4);

    // Right meta
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    this.color(SLATE_400);
    doc.text("DENTAL REVENUE RECOVERY", PAGE_W - MARGIN_X, ly + 4.5, {
      align: "right",
    });
    doc.text(generatedDate, PAGE_W - MARGIN_X, ly + 9, { align: "right" });

    // Accent rule
    this.y = 32;
    this.fill(BLUE);
    doc.rect(MARGIN_X, this.y, 24, 0.9, "F");
    this.stroke(BORDER);
    doc.setLineWidth(0.3);
    doc.line(MARGIN_X + 26, this.y + 0.45, PAGE_W - MARGIN_X, this.y + 0.45);

    // Title block
    this.y += 14;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    this.color(NAVY);
    doc.text("Appeal Packet", MARGIN_X, this.y);

    this.y += 8.5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12.5);
    this.color(SLATE_500);
    doc.text("Prepared for Human Review", MARGIN_X, this.y);

    this.y += 6;
    doc.setFontSize(9.5);
    this.color(SLATE_400);
    doc.text(`Generated ${generatedDate}`, MARGIN_X, this.y);

    this.y += 10;
  }

  // ---- Section headings -----------------------------------------------------
  sectionHeading(title: string) {
    this.ensure(16);
    this.gap(2);
    const doc = this.doc;
    this.fill(BLUE);
    doc.rect(MARGIN_X, this.y - 3.4, 1.6, 4.4, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    this.color(NAVY);
    doc.text(title.toUpperCase(), MARGIN_X + 4.5, this.y);
    this.gap(2.6);
    this.stroke(BORDER);
    doc.setLineWidth(0.3);
    doc.line(MARGIN_X, this.y, PAGE_W - MARGIN_X, this.y);
    this.gap(6);
  }

  documentHeading(title: string, subtitle: string) {
    const doc = this.doc;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    this.color(BLUE);
    doc.text("APPEAL PACKET", MARGIN_X, this.y);
    this.gap(7);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(19);
    this.color(NAVY);
    doc.text(title, MARGIN_X, this.y);
    this.gap(5.5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    this.color(SLATE_500);
    doc.text(subtitle, MARGIN_X, this.y);
    this.gap(3.5);
    this.fill(BLUE);
    doc.rect(MARGIN_X, this.y, 18, 0.8, "F");
    this.gap(8);
  }

  // ---- Body content ---------------------------------------------------------
  paragraph(
    text: string,
    opts: { size?: number; color?: RGB; bold?: boolean; width?: number } = {}
  ) {
    const size = opts.size ?? 10.5;
    const width = opts.width ?? CONTENT_W;
    const lineH = this.lh(size, 1.55);
    const doc = this.doc;
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(size);
    this.color(opts.color ?? SLATE_700);

    const paragraphs = text.replace(/\r/g, "").split("\n");
    for (const para of paragraphs) {
      if (para.trim() === "") {
        this.gap(lineH * 0.55);
        continue;
      }
      const lines = doc.splitTextToSize(para, width) as string[];
      for (const line of lines) {
        this.ensure(lineH);
        doc.text(line, MARGIN_X, this.y);
        this.y += lineH;
      }
    }
  }

  bulletCheck(items: string[]) {
    const size = 10.5;
    const lineH = this.lh(size, 1.5);
    const doc = this.doc;
    for (const item of items) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(size);
      const lines = doc.splitTextToSize(item, CONTENT_W - 8) as string[];
      const blockH = Math.max(lineH, lines.length * lineH);
      this.ensure(blockH + 1.5);
      const startY = this.y;
      // check glyph
      this.fill([236, 253, 245]);
      this.stroke([167, 243, 208]);
      doc.setLineWidth(0.3);
      doc.circle(MARGIN_X + 2, startY - 1.4, 2, "FD");
      this.stroke(EMERALD);
      doc.setLineWidth(0.6);
      doc.line(MARGIN_X + 1.1, startY - 1.5, MARGIN_X + 1.8, startY - 0.8);
      doc.line(MARGIN_X + 1.8, startY - 0.8, MARGIN_X + 3, startY - 2.4);
      // text
      this.color(SLATE_700);
      lines.forEach((line, i) => {
        doc.text(line, MARGIN_X + 7, startY + i * lineH);
      });
      this.y = startY + blockH + 1.8;
    }
  }

  bulletWarnings(items: string[]) {
    const size = 10;
    const lineH = this.lh(size, 1.5);
    const doc = this.doc;
    for (const item of items) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(size);
      const lines = doc.splitTextToSize(item, CONTENT_W - 8) as string[];
      const blockH = Math.max(lineH, lines.length * lineH);
      this.ensure(blockH + 1.5);
      const startY = this.y;
      this.fill([245, 158, 11]);
      doc.circle(MARGIN_X + 1.6, startY - 1.5, 0.9, "F");
      this.color(SLATE_600);
      lines.forEach((line, i) => {
        doc.text(line, MARGIN_X + 6, startY + i * lineH);
      });
      this.y = startY + blockH + 1.6;
    }
  }

  checklist(items: string[]) {
    const size = 10.5;
    const lineH = this.lh(size, 1.5);
    const doc = this.doc;
    if (items.length === 0) {
      this.paragraph(
        "No outstanding documentation identified. Confirm all records are attached before submission.",
        { color: SLATE_500, size: 10 }
      );
      return;
    }
    for (const item of items) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(size);
      const lines = doc.splitTextToSize(item, CONTENT_W - 9) as string[];
      const blockH = Math.max(7, lines.length * lineH);
      this.ensure(blockH + 1.5);
      const startY = this.y;
      // checkbox
      this.stroke(SLATE_400);
      doc.setLineWidth(0.4);
      doc.roundedRect(MARGIN_X, startY - 3.5, 4, 4, 0.6, 0.6, "S");
      this.color(SLATE_700);
      lines.forEach((line, i) => {
        doc.text(line, MARGIN_X + 7, startY + i * lineH);
      });
      this.y = startY + blockH + 1.6;
    }
  }

  summaryTable(rows: { label: string; value: string; accent?: boolean }[]) {
    const doc = this.doc;
    const rowH = 9.5;
    const tableH = rows.length * rowH;
    this.ensure(tableH + 4);
    const top = this.y;
    const valueX = MARGIN_X + CONTENT_W * 0.42;

    rows.forEach((row, i) => {
      const ry = top + i * rowH;
      if (i > 0) {
        this.stroke(BORDER);
        doc.setLineWidth(0.25);
        doc.line(MARGIN_X + 1, ry, PAGE_W - MARGIN_X - 1, ry);
      }
      const baseline = ry + rowH / 2 + 1.4;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.8);
      this.color(SLATE_500);
      doc.text(row.label.toUpperCase(), MARGIN_X + 4, baseline);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      this.color(row.accent ? BLUE : NAVY);
      const vLines = doc.splitTextToSize(
        row.value,
        CONTENT_W * 0.55
      ) as string[];
      doc.text(vLines[0] ?? "—", valueX, baseline);
    });

    // outer frame
    this.stroke(BORDER);
    doc.setLineWidth(0.35);
    doc.roundedRect(MARGIN_X, top, CONTENT_W, tableH, 1.8, 1.8, "S");
    this.y = top + tableH + 4;
  }

  noticeBox(title: string, body: string) {
    const doc = this.doc;
    const size = 9.8;
    const lineH = this.lh(size, 1.5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(body, CONTENT_W - 14) as string[];
    const boxH = 12 + lines.length * lineH;
    this.ensure(boxH + 2);
    const top = this.y;
    this.fill(AMBER_BG);
    this.stroke(AMBER_BORDER);
    doc.setLineWidth(0.4);
    doc.roundedRect(MARGIN_X, top, CONTENT_W, boxH, 2, 2, "FD");
    // accent bar
    this.fill([245, 158, 11]);
    doc.rect(MARGIN_X, top, 1.4, boxH, "F");
    // title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    this.color(AMBER_TEXT);
    doc.text(title, MARGIN_X + 6, top + 7);
    // body
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    this.color(SLATE_700);
    lines.forEach((line, i) => {
      doc.text(line, MARGIN_X + 6, top + 12.5 + i * lineH);
    });
    this.y = top + boxH + 4;
  }

  // ---- Post-process headers + footers --------------------------------------
  finalize() {
    const doc = this.doc;
    const total = doc.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
      doc.setPage(p);
      // running header (pages 2+)
      if (p > 1) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        this.color(SLATE_400);
        doc.text(`Appeal Packet — ${this.patientLabel}`, MARGIN_X, 12);
        doc.text(this.insurance, PAGE_W - MARGIN_X, 12, { align: "right" });
        this.stroke(BORDER);
        doc.setLineWidth(0.25);
        doc.line(MARGIN_X, 14, PAGE_W - MARGIN_X, 14);
      }
      // footer
      this.stroke(BORDER);
      doc.setLineWidth(0.25);
      doc.line(MARGIN_X, FOOTER_Y - 4, PAGE_W - MARGIN_X, FOOTER_Y - 4);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      this.color(SLATE_400);
      doc.text("Generated by QuickClaim AI · Demo build", MARGIN_X, FOOTER_Y);
      doc.text(`Page ${p} of ${total}`, PAGE_W - MARGIN_X, FOOTER_Y, {
        align: "right",
      });
    }
  }
}

// ---- Document assembly ------------------------------------------------------
export function buildAppealPdfDoc(input: AppealPdfInput): jsPDF {
  const { form, content, result, analysis } = input;
  const patientLabel = analysis?.patientName?.trim() || form.patientId || "Patient";
  const generatedDate = formatDate(new Date().toISOString());
  const level = readinessLevel(input);
  const procedureCodes =
    analysis?.procedureCodes && analysis.procedureCodes.length > 0
      ? analysis.procedureCodes.join(", ")
      : form.procedureCode || "—";
  const denialCategory = analysis?.denialCategory ?? "Missing Documentation";

  const b = new PdfBuilder(patientLabel, form.insurance || "—");

  // ---- PAGE 1: Cover + claim summary + executive summary + findings + checklist
  b.coverHeader(generatedDate);

  b.sectionHeading("Claim Summary");
  b.summaryTable([
    { label: "Insurance Company", value: form.insurance || "—" },
    { label: "Procedure Code(s)", value: procedureCodes },
    { label: "Date of Service", value: formatDate(form.treatmentDate) },
    { label: "Denied Amount", value: usd(form.deniedAmount), accent: true },
    { label: "Denial Category", value: denialCategory },
    { label: "Appeal Success Assessment", value: assessmentText(level) },
    {
      label: "Est. Revenue Recovery",
      value: estimatedRecovery(form.deniedAmount, level),
      accent: true,
    },
  ]);

  b.sectionHeading("Executive Summary");
  b.paragraph(buildExecutiveSummary(input), { size: 10.5, color: SLATE_700 });

  b.sectionHeading("AI Findings");
  b.bulletCheck(aiFindings(input));

  b.sectionHeading("Missing Documentation Checklist");
  b.checklist(linesToArray(content.missingDocuments));

  // ---- PAGE 2: Appeal Letter
  b.newPage();
  b.documentHeading("Appeal Letter", "Ready for practice letterhead after review");
  b.paragraph(content.appealLetter, { size: 11, color: NAVY });

  // ---- PAGE 3: Clinical Narrative
  b.newPage();
  b.documentHeading(
    "Clinical Narrative",
    "Supporting medical and dental necessity"
  );
  b.paragraph(content.clinicalNarrative, { size: 11, color: NAVY });

  // ---- Resubmission Checklist
  b.newPage();
  b.documentHeading("Resubmission Checklist", "Complete before sending to payer");
  b.checklist(linesToArray(content.resubmissionChecklist));

  // ---- Payer Call Script
  b.gap(4);
  b.sectionHeading("Payer Call Script");
  b.paragraph(content.payerCallScript, { size: 10.5, color: SLATE_700 });

  // ---- LAST PAGE: Internal notes + risk warnings + review notice
  b.newPage();
  b.documentHeading("Internal Billing Notes", "For your team — not sent to the payer");
  b.paragraph(content.internalBillingNote, { size: 10.5, color: SLATE_700 });

  if (result.riskWarnings.length > 0) {
    b.gap(4);
    b.sectionHeading("Risk Warnings");
    b.bulletWarnings(result.riskWarnings);
  }

  b.gap(4);
  b.noticeBox(
    "Human Review Required",
    "This AI-generated appeal packet is intended for billing workflow support only. A qualified billing professional must review and approve all materials before submission. QuickClaim AI does not guarantee reimbursement, claim approval, or payer acceptance."
  );

  b.finalize();
  return b.doc;
}

function safeFileName(input: AppealPdfInput): string {
  const base =
    input.analysis?.patientName?.trim() || input.form.patientId || "appeal";
  const cleaned = base.replace(/[^a-zA-Z0-9-_]+/g, "-").replace(/-+/g, "-");
  return `Appeal-Packet-${cleaned}.pdf`;
}

export function downloadAppealPdf(input: AppealPdfInput): void {
  const doc = buildAppealPdfDoc(input);
  doc.save(safeFileName(input));
}

export function printAppealPdf(input: AppealPdfInput): void {
  const doc = buildAppealPdfDoc(input);
  doc.autoPrint();
  const blobUrl = doc.output("bloburl");
  const win = window.open(blobUrl, "_blank", "noopener,noreferrer");
  if (!win) {
    // popup blocked — fall back to download
    doc.save(safeFileName(input));
  }
}
