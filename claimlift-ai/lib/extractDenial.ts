import { documentOptions, insuranceOptions } from "@/lib/mockData";
import type {
  AppealFormData,
  AppealReadiness,
  DenialCategory,
  ExtractDenialResult,
} from "@/lib/types";

export const ACCEPTED_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
]);

export const ACCEPTED_EXTENSIONS = [".pdf", ".png", ".jpg", ".jpeg"];

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const EXTRACT_SYSTEM_PROMPT = `You are an expert dental billing document analyst. Extract structured claim denial information AND produce a professional AI claim analysis from dental insurance denial letters and EOBs.

Respond with ONLY valid JSON (no markdown, no code fences, no commentary) in exactly this schema:
{
  "insuranceCompany": "string — payer/insurance company name",
  "patientName": "string — patient name if visible, else empty string",
  "procedureCodes": ["array of CDT/procedure codes like D2740, D4341"],
  "deniedAmount": "string — numeric amount only, no currency symbol, e.g. 1180.00",
  "treatmentDate": "string — ISO date YYYY-MM-DD if found, else empty string",
  "denialReason": "string — concise summary of why the claim was denied",
  "eobText": "string — relevant denial/EOB language excerpted from the document",
  "missingDocumentation": ["specific missing items inferred from denial language, e.g. Bitewing radiographs, Periapical X-rays, Clinical narrative, Periodontal charting — be specific to what the payer likely needs"],
  "confidenceScore": "percentage string like '82%'",
  "aiFindings": ["3-5 short positive findings about what was successfully identified, e.g. Claim information successfully extracted, Procedure identified, Denial reason identified"],
  "denialCategory": "exactly one of: Medical Necessity | Missing Documentation | Frequency Limitation | Benefit Exclusion | Waiting Period | Coordination of Benefits | Other",
  "appealReadiness": {
    "level": "exactly one of: High | Medium | Low",
    "explanation": "1-2 sentences explaining readiness based on documentation clarity, denial type, and missing items — not a guarantee of approval"
  },
  "recommendedNextSteps": ["3-5 practical billing actions before generating an appeal, e.g. Gather periapical radiographs, Confirm date of service, Draft clinical narrative"]
}

Rules:
- Use empty string or empty array when a field is not found — do not invent clinical facts.
- procedureCodes should only include codes visibly present in the document.
- missingDocumentation must be inferred from the denial/EOB language — list specific dental records likely required, not generic placeholders.
- confidenceScore reflects extraction clarity (not appeal success probability).
- denialCategory must be the single best-fit primary category.
- appealReadiness.level reflects how prepared the office appears to appeal based on available information — never imply guaranteed reimbursement.
- This is for demo billing workflow support only.`;

export const EXTRACT_USER_PROMPT = `Analyze this dental insurance denial letter or EOB. Extract all claim fields and produce a full AI claim analysis as JSON per the schema. If the document is unclear, return empty values where appropriate, a low confidenceScore, appealReadiness level Low, and recommendedNextSteps that guide manual review.`;

export const DENIAL_CATEGORIES: DenialCategory[] = [
  "Medical Necessity",
  "Missing Documentation",
  "Frequency Limitation",
  "Benefit Exclusion",
  "Waiting Period",
  "Coordination of Benefits",
  "Other",
];

function normalizeDenialCategory(raw: string): DenialCategory {
  const match = DENIAL_CATEGORIES.find(
    (c) => c.toLowerCase() === raw.trim().toLowerCase()
  );
  return match ?? "Other";
}

function normalizeReadinessLevel(raw: string): "High" | "Medium" | "Low" {
  const lower = raw.trim().toLowerCase();
  if (lower === "high") return "High";
  if (lower === "medium") return "Medium";
  return "Low";
}

function parseAppealReadiness(raw: unknown): AppealReadiness {
  if (!raw || typeof raw !== "object") {
    return {
      level: "Low",
      explanation:
        "Insufficient information to assess appeal readiness. Review the document manually.",
    };
  }
  const obj = raw as Partial<AppealReadiness>;
  return {
    level: normalizeReadinessLevel(String(obj.level ?? "Low")),
    explanation: String(
      obj.explanation ??
        "Review extracted fields and gather supporting documentation before appealing."
    ),
  };
}

export function parseExtractionJson(text: string): ExtractDenialResult {
  const trimmed = text.trim();
  const jsonMatch =
    trimmed.match(/```(?:json)?\s*([\s\S]*?)```/) ??
    trimmed.match(/(\{[\s\S]*\})/);

  const raw = jsonMatch ? jsonMatch[1].trim() : trimmed;
  const parsed = JSON.parse(raw) as Partial<ExtractDenialResult> & {
    recommendedMissingDocumentation?: string[];
  };

  const missingDocumentation = Array.isArray(parsed.missingDocumentation)
    ? parsed.missingDocumentation.map(String)
    : Array.isArray(parsed.recommendedMissingDocumentation)
      ? parsed.recommendedMissingDocumentation.map(String)
      : [];

  const requiredScalars: (keyof ExtractDenialResult)[] = [
    "insuranceCompany",
    "patientName",
    "procedureCodes",
    "deniedAmount",
    "treatmentDate",
    "denialReason",
    "eobText",
    "confidenceScore",
    "denialCategory",
  ];

  for (const key of requiredScalars) {
    if (parsed[key] === undefined || parsed[key] === null) {
      throw new Error(`Claude response missing required field: ${key}`);
    }
  }

  if (!parsed.appealReadiness) {
    throw new Error("Claude response missing required field: appealReadiness");
  }

  return {
    insuranceCompany: String(parsed.insuranceCompany ?? ""),
    patientName: String(parsed.patientName ?? ""),
    procedureCodes: Array.isArray(parsed.procedureCodes)
      ? parsed.procedureCodes.map(String)
      : [],
    deniedAmount: String(parsed.deniedAmount ?? ""),
    treatmentDate: String(parsed.treatmentDate ?? ""),
    denialReason: String(parsed.denialReason ?? ""),
    eobText: String(parsed.eobText ?? ""),
    missingDocumentation,
    recommendedMissingDocumentation: missingDocumentation,
    confidenceScore: String(parsed.confidenceScore ?? "0%"),
    aiFindings: Array.isArray(parsed.aiFindings)
      ? parsed.aiFindings.map(String)
      : [],
    denialCategory: normalizeDenialCategory(String(parsed.denialCategory)),
    appealReadiness: parseAppealReadiness(parsed.appealReadiness),
    recommendedNextSteps: Array.isArray(parsed.recommendedNextSteps)
      ? parsed.recommendedNextSteps.map(String)
      : [],
  };
}

function toDemoPatientId(name: string): string {
  const cleaned = name
    .trim()
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .toUpperCase();
  if (!cleaned) return "DEMO-UNKNOWN";
  if (cleaned.startsWith("DEMO-")) return cleaned.slice(0, 24);
  return `DEMO-${cleaned.slice(0, 20)}`;
}

export function matchInsurance(name: string): string {
  if (!name.trim()) return "Other";
  const lower = name.toLowerCase();
  const match = insuranceOptions.find(
    (opt) =>
      opt !== "Other" &&
      (lower.includes(opt.toLowerCase()) ||
        opt.toLowerCase().includes(lower.split(" ")[0]))
  );
  return match ?? "Other";
}

function normalizeDate(raw: string): string {
  if (!raw.trim()) return "";
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return raw;
  const us = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (us) {
    const [, m, d, y] = us;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return "";
}

function normalizeAmount(raw: string): string {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  if (!cleaned) return "";
  const n = parseFloat(cleaned);
  return Number.isNaN(n) ? "" : String(n);
}

function normalizeProcedureCode(codes: string[]): string {
  if (codes.length === 0) return "";
  const first = codes[0];
  const match = first.match(/D\d{4}/i);
  return match ? match[0].toUpperCase() : first.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

function mapDocumentsFromMissing(missing: string[]): string[] {
  const missingLower = missing.map((m) => m.toLowerCase());
  const isMissing = (opt: string) => {
    const optLower = opt.toLowerCase();
    return missingLower.some(
      (m) =>
        m.includes(optLower) ||
        optLower.includes(m) ||
        (optLower === "x-rays" &&
          (m.includes("xray") ||
            m.includes("x-ray") ||
            m.includes("radiograph"))) ||
        (optLower === "periodontal charting" &&
          (m.includes("perio") || m.includes("charting"))) ||
        (optLower === "intraoral photos" &&
          (m.includes("photo") || m.includes("intraoral"))) ||
        (optLower === "existing narrative" && m.includes("narrative")) ||
        (optLower === "treatment plan" && m.includes("treatment plan"))
    );
  };

  const available = documentOptions.filter((opt) => !isMissing(opt));
  if (!available.includes("EOB")) {
    available.push("EOB");
  }
  return available;
}

/** Map Claude extraction output into the existing appeal form shape. */
export function extractionToForm(
  extraction: ExtractDenialResult,
  currentForm: AppealFormData
): AppealFormData {
  const procedureCode =
    normalizeProcedureCode(extraction.procedureCodes) || currentForm.procedureCode;
  const patientId = extraction.patientName
    ? toDemoPatientId(extraction.patientName)
    : currentForm.patientId;
  const insurance = matchInsurance(extraction.insuranceCompany);
  const documents = mapDocumentsFromMissing(
    extraction.missingDocumentation.length > 0
      ? extraction.missingDocumentation
      : extraction.recommendedMissingDocumentation
  );

  return {
    ...currentForm,
    patientId,
    insurance,
    procedureCode,
    treatmentDate:
      normalizeDate(extraction.treatmentDate) || currentForm.treatmentDate,
    deniedAmount:
      normalizeAmount(extraction.deniedAmount) || currentForm.deniedAmount,
    denialReason: extraction.denialReason || currentForm.denialReason,
    eobText: extraction.eobText || currentForm.eobText,
    documents,
  };
}

export function generateMockExtraction(): ExtractDenialResult {
  const missingDocumentation = [
    "Bitewing radiographs",
    "Periapical X-rays",
    "Clinical narrative of necessity",
    "Periodontal charting",
  ];

  return {
    insuranceCompany: "Delta Dental",
    patientName: "Demo Patient",
    procedureCodes: ["D2740"],
    deniedAmount: "1180",
    treatmentDate: "2026-06-01",
    denialReason: "Missing pre-treatment radiographs",
    eobText:
      "Claim denied. Procedure not payable without supporting pre-treatment radiographs and narrative of necessity. (Mock extraction — set ANTHROPIC_API_KEY for live document analysis.)",
    missingDocumentation,
    recommendedMissingDocumentation: missingDocumentation,
    confidenceScore: "72%",
    aiFindings: [
      "Claim information successfully extracted",
      "Procedure D2740 identified",
      "Denial reason identified from EOB language",
      "Payer and date of service captured",
    ],
    denialCategory: "Missing Documentation",
    appealReadiness: {
      level: "Medium",
      explanation:
        "The denial appears documentation-driven. With radiographs and a clinical narrative, this claim may be worth appealing — but payer review is not guaranteed.",
    },
    recommendedNextSteps: [
      "Obtain pre-treatment periapical or bitewing radiographs with date stamps",
      "Draft or update a clinical narrative addressing medical/dental necessity",
      "Confirm the date of service and procedure code on the original claim",
      "Verify timely-filing window before submitting an appeal",
      "Review the populated appeal form below before generating the packet",
    ],
  };
}

export function formatDisplayDate(iso: string): string {
  if (!iso.trim()) return "—";
  const d = new Date(iso.includes("T") ? iso : `${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDisplayAmount(raw: string): string {
  const n = parseFloat(raw.replace(/[^0-9.]/g, ""));
  if (!raw || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

export function resolveMimeType(file: File): string | null {
  const type = file.type.toLowerCase();
  if (ACCEPTED_MIME_TYPES.has(type)) {
    return type === "image/jpg" ? "image/jpeg" : type;
  }
  const ext = file.name.toLowerCase().match(/\.[^.]+$/)?.[0];
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  return null;
}
