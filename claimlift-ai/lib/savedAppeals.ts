import type {
  AppealFormData,
  AppealStatus,
  GenerateAppealApiResponse,
  SavedAppeal,
} from "./types";
import { parseConfidenceScore } from "./types";

export const SAVED_APPEALS_KEY = "claimlift_saved_appeals";

export function deriveStatus(result: GenerateAppealApiResponse): AppealStatus {
  return parseConfidenceScore(result.confidenceScore) >= 70
    ? "Generated"
    : "Needs Review";
}

function computeSignature(
  form: AppealFormData,
  result: GenerateAppealApiResponse
): string {
  return [
    form.patientId,
    form.insurance,
    form.procedureCode,
    form.denialReason,
    result.appealLetter.slice(0, 120),
  ].join("|");
}

export function getSavedAppeals(): SavedAppeal[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SAVED_APPEALS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedAppeal[]) : [];
  } catch {
    return [];
  }
}

export function getSavedAppeal(id: string): SavedAppeal | null {
  return getSavedAppeals().find((a) => a.id === id) ?? null;
}

/**
 * Saves only the current generated appeal. If an identical appeal (same
 * signature) is already saved, the existing record is returned instead of
 * creating a duplicate.
 */
export function saveAppeal(
  form: AppealFormData,
  result: GenerateAppealApiResponse
): SavedAppeal {
  const appeals = getSavedAppeals();
  const signature = computeSignature(form, result);

  const existing = appeals.find((a) => a.signature === signature);
  if (existing) return existing;

  const id =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `appeal-${Date.now()}`;

  const status: AppealStatus = deriveStatus(result);

  const saved: SavedAppeal = {
    id,
    createdAt: new Date().toISOString(),
    patientId: form.patientId,
    insurance: form.insurance,
    procedureCode: form.procedureCode,
    treatmentDate: form.treatmentDate,
    deniedAmount: form.deniedAmount,
    denialReason: form.denialReason,
    status,
    signature,
    result,
  };

  window.localStorage.setItem(
    SAVED_APPEALS_KEY,
    JSON.stringify([saved, ...appeals])
  );
  return saved;
}

/**
 * Updates an existing saved appeal in place (by id) with the latest edited
 * content. Returns null if no record with that id exists.
 */
export function updateSavedAppeal(
  id: string,
  form: AppealFormData,
  result: GenerateAppealApiResponse
): SavedAppeal | null {
  const appeals = getSavedAppeals();
  const index = appeals.findIndex((a) => a.id === id);
  if (index === -1) return null;

  const updated: SavedAppeal = {
    ...appeals[index],
    patientId: form.patientId,
    insurance: form.insurance,
    procedureCode: form.procedureCode,
    treatmentDate: form.treatmentDate,
    deniedAmount: form.deniedAmount,
    denialReason: form.denialReason,
    status: deriveStatus(result),
    signature: computeSignature(form, result),
    result,
  };

  appeals[index] = updated;
  window.localStorage.setItem(SAVED_APPEALS_KEY, JSON.stringify(appeals));
  return updated;
}

/**
 * Saves the current edited appeal. If `existingId` is supplied and still
 * exists, the record is updated in place (prevents duplicates when re-saving
 * edits). Otherwise a new record is created with signature-based de-duplication.
 */
export function saveOrUpdateAppeal(
  form: AppealFormData,
  result: GenerateAppealApiResponse,
  existingId?: string | null
): SavedAppeal {
  if (existingId) {
    const updated = updateSavedAppeal(existingId, form, result);
    if (updated) return updated;
  }
  return saveAppeal(form, result);
}

export function findSavedByContent(
  form: AppealFormData,
  result: GenerateAppealApiResponse
): SavedAppeal | null {
  const signature = computeSignature(form, result);
  return getSavedAppeals().find((a) => a.signature === signature) ?? null;
}

export function clearSavedAppeals(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SAVED_APPEALS_KEY);
}
