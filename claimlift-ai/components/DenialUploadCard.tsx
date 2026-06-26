"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import {
  ACCEPTED_EXTENSIONS,
  MAX_UPLOAD_BYTES,
  resolveMimeType,
} from "@/lib/extractDenial";
import type { ExtractDenialApiResponse } from "@/lib/types";

const LOADING_STEPS = [
  "Reading document...",
  "Extracting claim information...",
  "Running AI claim analysis...",
  "Identifying denial reason...",
  "Preparing report...",
] as const;

const EXTRACTION_ERROR_MESSAGE =
  "We couldn't confidently extract the claim details. Please review or enter them manually.";

type UploadState = "idle" | "dragging" | "extracting" | "success" | "error";

interface DenialUploadCardProps {
  onExtracted: (result: ExtractDenialApiResponse) => void;
  onExtractingChange?: (extracting: boolean) => void;
  onReset?: () => void;
  disabled?: boolean;
  compactSuccess?: boolean;
}

export default function DenialUploadCard({
  onExtracted,
  onExtractingChange,
  onReset,
  disabled = false,
  compactSuccess = false,
}: DenialUploadCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [fileName, setFileName] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ExtractDenialApiResponse | null>(
    null
  );

  useEffect(() => {
    if (state !== "extracting") return;
    setLoadingStep(0);
    const interval = setInterval(() => {
      setLoadingStep((prev) =>
        prev < LOADING_STEPS.length - 1 ? prev + 1 : prev
      );
    }, 1400);
    return () => clearInterval(interval);
  }, [state]);

  const processFile = useCallback(
    async (file: File) => {
      if (disabled) return;

      const mime = resolveMimeType(file);
      if (!mime) {
        setState("error");
        setErrorMessage(
          "Unsupported file type. Upload a PDF, PNG, JPG, or JPEG."
        );
        return;
      }

      if (file.size > MAX_UPLOAD_BYTES) {
        setState("error");
        setErrorMessage("File exceeds the 10 MB upload limit.");
        return;
      }

      setState("extracting");
      setFileName(file.name);
      setErrorMessage(null);
      setLastResult(null);
      onExtractingChange?.(true);

      try {
        const body = new FormData();
        body.append("file", file);

        const res = await fetch("/api/extract-denial", {
          method: "POST",
          body,
        });

        const data = (await res.json()) as ExtractDenialApiResponse & {
          error?: string;
        };

        if (!res.ok) {
          throw new Error(data.error ?? EXTRACTION_ERROR_MESSAGE);
        }

        setLastResult(data);
        setState("success");
        onExtracted(data);
      } catch {
        setState("error");
        setErrorMessage(EXTRACTION_ERROR_MESSAGE);
      } finally {
        onExtractingChange?.(false);
      }
    },
    [disabled, onExtracted, onExtractingChange]
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void processFile(file);
    e.target.value = "";
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && state !== "extracting") setState("dragging");
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (state === "dragging") setState("idle");
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled || state === "extracting") return;
    const file = e.dataTransfer.files?.[0];
    if (file) void processFile(file);
    else setState("idle");
  };

  const reset = () => {
    setState("idle");
    setFileName(null);
    setErrorMessage(null);
    setLastResult(null);
    setLoadingStep(0);
    onReset?.();
  };

  const isInteractive = !disabled && state !== "extracting";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
              Step 1 — Document intake
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
              Upload Denial Letter or EOB
            </h2>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-500">
              Upload a PDF or image and QuickClaim AI will extract the claim
              information before generating an appeal packet.
            </p>
          </div>
          {lastResult && state === "success" && (
            <Badge tone={lastResult.source === "claude" ? "blue" : "slate"} dot>
              {lastResult.source === "claude"
                ? "Extracted by Claude"
                : "Demo extraction"}
            </Badge>
          )}
        </div>
      </div>

      <div className="p-6">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(",")}
          onChange={onInputChange}
          className="sr-only"
          disabled={!isInteractive}
          aria-label="Upload denial letter or EOB"
        />

        <div
          role="button"
          tabIndex={isInteractive ? 0 : -1}
          onKeyDown={(e) => {
            if (isInteractive && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => isInteractive && inputRef.current?.click()}
          className={`relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-all duration-200 ${
            state === "dragging"
              ? "border-blue-500 bg-blue-50/80 shadow-inner"
              : state === "error"
                ? "border-red-200 bg-red-50/40"
                : state === "success"
                  ? "border-emerald-200 bg-emerald-50/40"
                  : state === "extracting"
                    ? "border-blue-300 bg-blue-50/50"
                    : "border-slate-300 bg-slate-50/50 hover:border-slate-400 hover:bg-slate-50"
          } ${!isInteractive ? "pointer-events-none opacity-70" : ""}`}
        >
          {state === "extracting" && (
            <div className="absolute inset-0 overflow-hidden rounded-xl">
              <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-blue-100/40 to-transparent" />
            </div>
          )}

          {state === "extracting" ? (
            <div className="relative z-10 flex flex-col items-center gap-4">
              <svg
                className="h-9 w-9 animate-spin text-blue-600"
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
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {LOADING_STEPS[loadingStep]}
                </p>
                {fileName && (
                  <p className="mt-1 max-w-xs truncate text-xs text-slate-500">
                    {fileName}
                  </p>
                )}
              </div>
            </div>
          ) : state === "success" ? (
            <div className="relative z-10 flex flex-col items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 ring-1 ring-inset ring-emerald-200">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path
                    d="M5 13l4 4L19 7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Document processed successfully
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {compactSuccess
                    ? "AI claim analysis is ready below."
                    : "Review the AI claim analysis below before continuing."}
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  reset();
                }}
              >
                Upload another file
              </Button>
            </div>
          ) : state === "error" ? (
            <div className="relative z-10 flex flex-col items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 ring-1 ring-inset ring-red-200">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Extraction unsuccessful
                </p>
                <p className="mt-1 max-w-md text-sm text-slate-600">
                  {errorMessage ?? EXTRACTION_ERROR_MESSAGE}
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  reset();
                }}
              >
                Try again
              </Button>
            </div>
          ) : (
            <div className="relative z-10 flex flex-col items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm ring-1 ring-inset ring-slate-200/80">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path
                    d="M12 3v12M8 11l4 4 4-4M5 19h14"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Drag and drop your denial letter or EOB
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  PDF, PNG, JPG, or JPEG — up to 10 MB
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  inputRef.current?.click();
                }}
              >
                Browse files
              </Button>
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          Files are processed in memory only and are not stored on our servers.
        </p>
      </div>
    </div>
  );
}
