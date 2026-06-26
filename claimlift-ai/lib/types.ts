export type AppealStatus =
  | "Draft"
  | "Generated"
  | "Ready"
  | "Needs Review"
  | "Submitted"
  | "Paid"
  | "Denied Again";

export interface AppealFormData {
  patientId: string;
  insurance: string;
  procedureCode: string;
  treatmentDate: string;
  deniedAmount: string;
  denialReason: string;
  eobText: string;
  clinicalNotes: string;
  documents: string[];
}

export interface GenerateAppealRequest {
  demoPatientId: string;
  insuranceCompany: string;
  procedureCode: string;
  treatmentDate: string;
  deniedAmount: string;
  denialReason: string;
  eobText: string;
  clinicalNotes: string;
  attachmentsAvailable: string[];
}

export interface GeneratedAppeal {
  appealLetter: string;
  missingDocuments: string[];
  clinicalNarrative: string;
  resubmissionChecklist: string[];
  payerCallScript: string;
  internalBillingNote: string;
  confidenceScore: string;
  riskWarnings: string[];
}

export type AppealSource = "claude" | "mock";

export interface GenerateAppealApiResponse extends GeneratedAppeal {
  source: AppealSource;
}

export interface SavedAppeal {
  id: string;
  createdAt: string;
  patientId: string;
  insurance: string;
  procedureCode: string;
  treatmentDate: string;
  deniedAmount: string;
  denialReason: string;
  status: AppealStatus;
  signature: string;
  result: GenerateAppealApiResponse;
}

export function formToApiRequest(form: AppealFormData): GenerateAppealRequest {
  return {
    demoPatientId: form.patientId,
    insuranceCompany: form.insurance,
    procedureCode: form.procedureCode,
    treatmentDate: form.treatmentDate,
    deniedAmount: form.deniedAmount,
    denialReason: form.denialReason,
    eobText: form.eobText,
    clinicalNotes: form.clinicalNotes,
    attachmentsAvailable: form.documents,
  };
}

export function apiRequestToForm(body: GenerateAppealRequest): AppealFormData {
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

export function parseConfidenceScore(score: string): number {
  const match = score.match(/\d+/);
  if (!match) return 0;
  return Math.min(100, Math.max(0, parseInt(match[0], 10)));
}

export type DenialCategory =
  | "Medical Necessity"
  | "Missing Documentation"
  | "Frequency Limitation"
  | "Benefit Exclusion"
  | "Waiting Period"
  | "Coordination of Benefits"
  | "Other";

export type AppealReadinessLevel = "High" | "Medium" | "Low";

export interface AppealReadiness {
  level: AppealReadinessLevel;
  explanation: string;
}

export interface ExtractDenialResult {
  insuranceCompany: string;
  patientName: string;
  procedureCodes: string[];
  deniedAmount: string;
  treatmentDate: string;
  denialReason: string;
  eobText: string;
  /** @deprecated use missingDocumentation */
  recommendedMissingDocumentation: string[];
  missingDocumentation: string[];
  confidenceScore: string;
  aiFindings: string[];
  denialCategory: DenialCategory;
  appealReadiness: AppealReadiness;
  recommendedNextSteps: string[];
}

export type ExtractDenialSource = "claude" | "mock";

export interface ExtractDenialApiResponse extends ExtractDenialResult {
  source: ExtractDenialSource;
}
