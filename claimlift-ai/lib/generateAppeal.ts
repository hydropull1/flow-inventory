import type {
  AppealFormData,
  GeneratedAppeal,
  GenerateAppealRequest,
} from "./types";

const ALL_DOCS = [
  "X-rays",
  "Intraoral Photos",
  "Periodontal Charting",
  "Existing Narrative",
  "Referral",
  "EOB",
  "Treatment Plan",
];

export function requestToForm(body: GenerateAppealRequest): AppealFormData {
  return {
    patientId: body.demoPatientId,
    insurance: body.insuranceCompany,
    procedureCode: body.procedureCode,
    treatmentDate: body.treatmentDate,
    deniedAmount: body.deniedAmount,
    denialReason: body.denialReason,
    eobText: body.eobText,
    clinicalNotes: body.clinicalNotes,
    documents: body.attachmentsAvailable ?? [],
  };
}

/**
 * Mock appeal generator. Used when ANTHROPIC_API_KEY is missing or Claude fails.
 * Returns deterministic, template-based output for demo purposes.
 */
export function generateMockAppeal(
  input: AppealFormData | GenerateAppealRequest
): GeneratedAppeal {
  const form = "demoPatientId" in input ? requestToForm(input) : input;

  const patient = form.patientId || "DEMO-00000";
  const insurance = form.insurance || "the payer";
  const code = form.procedureCode || "the submitted procedure";
  const reason = form.denialReason || "the stated denial reason";
  const amount = form.deniedAmount ? `$${form.deniedAmount}` : "the denied amount";
  const treatmentDate = form.treatmentDate || "the date of service";

  const provided = new Set(form.documents);
  const missingDocuments = ALL_DOCS.filter((d) => !provided.has(d))
    .slice(0, 6)
    .map((d) => `${d} — recommended to strengthen this appeal for ${code}.`);
  if (missingDocuments.length === 0) {
    missingDocuments.push(
      "All standard supporting documents were marked as attached. Confirm legibility and date stamps before submission."
    );
  }

  const appealLetter = `To the Claims Review Department at ${insurance},

RE: Appeal of Denied Claim
Patient (Demo) ID: ${patient}
Procedure Code: ${code}
Date of Service: ${treatmentDate}
Denied Amount: ${amount}

We respectfully request reconsideration of the above claim, which was denied for the following reason: "${reason}."

Based on our clinical records, the treatment provided was necessary and consistent with accepted standards of dental care. We are submitting additional supporting documentation that addresses the basis for denial and substantiates medical and dental necessity.

We ask that this claim be re-adjudicated in light of the enclosed materials. Please contact our billing office with any questions or additional documentation requests.

Sincerely,
Billing Department
(Demo Practice — sample letter, human review required)`;

  const clinicalNarrative = `Patient (Demo ID ${patient}) presented for treatment associated with procedure ${code} on ${treatmentDate}. ${
    form.clinicalNotes
      ? `Clinical notes on file: ${form.clinicalNotes}`
      : "Clinical documentation supports the necessity of the rendered service."
  } The condition required intervention to prevent further deterioration and restore function. The selected procedure represents the appropriate standard of care for the presenting condition and was not elective. Supporting diagnostics and chart entries corroborate the diagnosis and the treatment rendered.`;

  const resubmissionChecklist = [
    `Attach corrected/clean claim referencing procedure ${code}.`,
    "Include the signed appeal letter on practice letterhead.",
    "Attach the clinical narrative of medical/dental necessity.",
    "Include all available radiographs and intraoral photos with date stamps.",
    `Reference the original claim number and denial reason ("${reason}").`,
    "Verify timely-filing window has not lapsed, then submit and keep proof.",
  ];

  const payerCallScript = `Hi, this is the billing office calling about a denied claim.

- Patient Demo ID: ${patient}
- Insurance: ${insurance}
- Procedure code: ${code}
- Date of service: ${treatmentDate}
- Denied amount: ${amount}

The claim was denied for "${reason}." We're submitting an appeal with supporting documentation. Can you confirm:
1) The correct appeals mailing address or fax/portal,
2) The appeal filing deadline for this claim, and
3) Whether a specific form or reference number is required?

Could you also note on the account that an appeal is in progress? Thank you.`;

  const internalBillingNote = `INTERNAL — Demo only. Appeal drafted for ${patient} (${insurance}, ${code}). Denial: "${reason}". Denied amount ${amount}. Next action: gather missing docs (${
    missingDocuments.length
  } flagged), route to provider for narrative sign-off, then submit before filing deadline. Do not submit without human review.`;

  const completeness = provided.size / ALL_DOCS.length;
  const hasNotes = form.clinicalNotes.trim().length > 20 ? 0.15 : 0;
  const hasEob = form.eobText.trim().length > 10 ? 0.1 : 0;
  const confidenceScore = String(
    Math.min(95, Math.round((0.45 + completeness * 0.3 + hasNotes + hasEob) * 100))
  );

  const riskWarnings: string[] = [];
  if (!provided.has("X-rays")) {
    riskWarnings.push(
      "No radiographs attached — many payers require pre-treatment X-rays for this category."
    );
  }
  if (!provided.has("Periodontal Charting") && code.startsWith("D4")) {
    riskWarnings.push(
      "Periodontal procedure without charting attached may be denied again."
    );
  }
  if (form.clinicalNotes.trim().length < 20) {
    riskWarnings.push(
      "Clinical notes are sparse — narrative may be too thin to overturn the denial."
    );
  }
  if (!form.treatmentDate) {
    riskWarnings.push(
      "Treatment date is missing — confirm before submission to avoid a timely-filing issue."
    );
  }
  riskWarnings.push(
    "HUMAN REVIEW REQUIRED: Do not submit this packet until a billing manager or provider has reviewed all content.",
    "AI-generated draft. This does not guarantee reimbursement. Verify all clinical claims and demo details before submitting."
  );

  return {
    appealLetter,
    missingDocuments,
    clinicalNarrative,
    resubmissionChecklist,
    payerCallScript,
    internalBillingNote,
    confidenceScore,
    riskWarnings: riskWarnings.slice(0, 6),
  };
}

export const SYSTEM_PROMPT = `You are an expert dental billing appeal assistant helping offices prepare insurance appeal packets for denied claims. Use professional, concise dental billing language. Never guarantee payment or say a claim will be approved. Always require human review. Flag missing documentation. Billing support only — demo data only.

Respond with ONLY valid JSON (no markdown, no code fences, no commentary) in exactly this schema and keep every field SHORT:
{
  "appealLetter": "string, 3-5 short paragraphs max",
  "missingDocuments": ["max 6 short bullets"],
  "clinicalNarrative": "string, 1-2 short paragraphs",
  "resubmissionChecklist": ["max 6 short bullets"],
  "payerCallScript": "string, up to 6 short bullet lines (start each with '- ')",
  "internalBillingNote": "string, 1 short paragraph",
  "confidenceScore": "percentage string like '70%'",
  "riskWarnings": ["max 6 short bullets; MUST include a human-review-required reminder"]
}

Rules: Reference the denial reason and procedure code in the letter. List any attachment not marked available in missingDocuments. confidenceScore reflects documentation completeness and must never imply guaranteed approval or reimbursement. Be brief — this is a demo packet.`;

export function buildUserPrompt(body: GenerateAppealRequest): string {
  const attachments =
    body.attachmentsAvailable?.length > 0
      ? body.attachmentsAvailable.join(", ")
      : "None";

  return `Denied dental claim (demo data). Generate a concise appeal packet as JSON.

Patient ID: ${body.demoPatientId}
Insurer: ${body.insuranceCompany}
Procedure: ${body.procedureCode}
Treatment date: ${body.treatmentDate || "N/A"}
Denied amount: $${body.deniedAmount || "0"}
Denial reason: ${body.denialReason}
EOB/denial text: ${body.eobText || "N/A"}
Clinical notes: ${body.clinicalNotes || "N/A"}
Attachments available: ${attachments}`;
}

export function parseClaudeJson(text: string): GeneratedAppeal {
  const trimmed = text.trim();
  const jsonMatch =
    trimmed.match(/```(?:json)?\s*([\s\S]*?)```/) ??
    trimmed.match(/(\{[\s\S]*\})/);

  const raw = jsonMatch ? jsonMatch[1].trim() : trimmed;
  const parsed = JSON.parse(raw) as Partial<GeneratedAppeal>;

  const required: (keyof GeneratedAppeal)[] = [
    "appealLetter",
    "missingDocuments",
    "clinicalNarrative",
    "resubmissionChecklist",
    "payerCallScript",
    "internalBillingNote",
    "confidenceScore",
    "riskWarnings",
  ];

  for (const key of required) {
    if (parsed[key] === undefined || parsed[key] === null) {
      throw new Error(`Claude response missing required field: ${key}`);
    }
  }

  return {
    appealLetter: String(parsed.appealLetter),
    missingDocuments: Array.isArray(parsed.missingDocuments)
      ? parsed.missingDocuments.map(String)
      : [],
    clinicalNarrative: String(parsed.clinicalNarrative),
    resubmissionChecklist: Array.isArray(parsed.resubmissionChecklist)
      ? parsed.resubmissionChecklist.map(String)
      : [],
    payerCallScript: String(parsed.payerCallScript),
    internalBillingNote: String(parsed.internalBillingNote),
    confidenceScore: String(parsed.confidenceScore),
    riskWarnings: Array.isArray(parsed.riskWarnings)
      ? parsed.riskWarnings.map(String)
      : [],
  };
}
