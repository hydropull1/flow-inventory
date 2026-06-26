"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AppealPacket from "@/components/AppealPacket";
import Button from "@/components/Button";
import { getSavedAppeal } from "@/lib/savedAppeals";
import type { SavedAppeal } from "@/lib/types";

type LoadState = "loading" | "found" | "missing";

export default function AppealDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [state, setState] = useState<LoadState>("loading");
  const [appeal, setAppeal] = useState<SavedAppeal | null>(null);

  useEffect(() => {
    if (!id) {
      setState("missing");
      return;
    }
    const found = getSavedAppeal(id);
    if (found) {
      setAppeal(found);
      setState("found");
    } else {
      setState("missing");
    }
  }, [id]);

  if (state === "loading") {
    return (
      <main className="mx-auto w-full max-w-4xl px-6 py-20 text-center text-slate-500">
        Loading appeal…
      </main>
    );
  }

  if (state === "missing" || !appeal) {
    return (
      <main className="mx-auto w-full max-w-4xl px-6 py-24 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
          </svg>
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-slate-900">
          Appeal not found.
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
          This saved appeal no longer exists, or it was cleared from this
          browser.
        </p>
        <div className="mt-6 flex justify-center gap-2.5">
          <Button href="/dashboard" variant="secondary" size="sm">
            Back to Dashboard
          </Button>
          <Button href="/appeals/new" size="sm">
            New Appeal
          </Button>
        </div>
      </main>
    );
  }

  const createdDate = new Date(appeal.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
            Saved appeal packet
          </p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900">
            {appeal.patientId} · {appeal.procedureCode}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {appeal.insurance} · Denial: {appeal.denialReason || "—"} · Saved{" "}
            {createdDate}
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Button href="/dashboard" variant="secondary" size="sm">
            Back to Dashboard
          </Button>
          <Button href="/appeals/new" size="sm">
            New Appeal
          </Button>
        </div>
      </div>

      <AppealPacket
        result={appeal.result}
        summary={{
          insurance: appeal.insurance,
          procedureCode: appeal.procedureCode,
          deniedAmount: appeal.deniedAmount,
          source: appeal.result.source,
          status: appeal.status,
        }}
      />

      <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center text-xs leading-relaxed text-slate-500">
        QuickClaim AI is for billing workflow support only. It does not guarantee
        reimbursement, claim approval, or payer acceptance. Human review is
        required before submission. Demo data only.
      </div>
    </main>
  );
}
