"use client";

import { useEffect, useState } from "react";
import AppealWorkspace from "@/components/AppealWorkspace";
import { generateMockAppeal } from "@/lib/generateAppeal";
import { findSavedByContent, saveOrUpdateAppeal } from "@/lib/savedAppeals";
import type {
  AppealFormData,
  ExtractDenialApiResponse,
  GenerateAppealApiResponse,
} from "@/lib/types";
import {
  workspaceToApiResponse,
  type WorkspaceContent,
} from "@/lib/workspace";

const FORM_STORAGE_KEY = "claimlift:appeal";
const RESULT_STORAGE_KEY = "claimlift:result";
const ANALYSIS_STORAGE_KEY = "claimlift:analysis";

const fallbackForm: AppealFormData = {
  patientId: "DEMO-10293",
  insurance: "Delta Dental",
  procedureCode: "D2740",
  treatmentDate: "2026-06-01",
  deniedAmount: "1180",
  denialReason: "Missing pre-treatment radiographs",
  eobText: "Demo EOB text.",
  clinicalNotes: "Demo clinical note.",
  documents: ["Treatment Plan", "EOB"],
};

export default function ResultPage() {
  const [form, setForm] = useState<AppealFormData | null>(null);
  const [result, setResult] = useState<GenerateAppealApiResponse | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ExtractDenialApiResponse | null>(
    null
  );

  useEffect(() => {
    const storedForm = sessionStorage.getItem(FORM_STORAGE_KEY);
    const storedResult = sessionStorage.getItem(RESULT_STORAGE_KEY);

    let parsedForm: AppealFormData = fallbackForm;
    if (storedForm) {
      try {
        parsedForm = JSON.parse(storedForm) as AppealFormData;
      } catch {
        /* use fallback */
      }
    }
    setForm(parsedForm);

    let parsedResult: GenerateAppealApiResponse | null = null;
    if (storedResult) {
      try {
        parsedResult = JSON.parse(storedResult) as GenerateAppealApiResponse;
      } catch {
        /* fall through to mock */
      }
    }
    if (!parsedResult) {
      parsedResult = { ...generateMockAppeal(parsedForm), source: "mock" };
    }
    setResult(parsedResult);

    const storedAnalysis = sessionStorage.getItem(ANALYSIS_STORAGE_KEY);
    if (storedAnalysis) {
      try {
        setAnalysis(JSON.parse(storedAnalysis) as ExtractDenialApiResponse);
      } catch {
        /* no analysis available */
      }
    }

    const alreadySaved = findSavedByContent(parsedForm, parsedResult);
    if (alreadySaved) setSavedId(alreadySaved.id);
  }, []);

  if (!form || !result) {
    return (
      <main className="mx-auto w-full max-w-4xl px-6 py-20 text-center text-slate-500">
        Loading appeal workspace…
      </main>
    );
  }

  const handleSaveToDashboard = (content: WorkspaceContent): string => {
    const updated = workspaceToApiResponse(content, result);
    setResult(updated);
    const saved = saveOrUpdateAppeal(form, updated, savedId);
    setSavedId(saved.id);
    sessionStorage.setItem(RESULT_STORAGE_KEY, JSON.stringify(updated));
    return saved.id;
  };

  return (
    <main className="mx-auto w-full max-w-4xl px-6 pb-16 pt-8">
      <AppealWorkspace
        form={form}
        result={result}
        analysis={analysis}
        savedId={savedId}
        onSaveToDashboard={handleSaveToDashboard}
      />
    </main>
  );
}
