import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import {
  EXTRACT_SYSTEM_PROMPT,
  EXTRACT_USER_PROMPT,
  generateMockExtraction,
  MAX_UPLOAD_BYTES,
  parseExtractionJson,
  resolveMimeType,
} from "@/lib/extractDenial";
import type { ExtractDenialApiResponse } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid multipart form data." },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "A file is required." },
      { status: 400 }
    );
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "File is empty." }, { status: 400 });
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "File exceeds the 10 MB upload limit." },
      { status: 400 }
    );
  }

  const mediaType = resolveMimeType(file);
  if (!mediaType) {
    return NextResponse.json(
      {
        error:
          "Unsupported file type. Upload a PDF, PNG, JPG, or JPEG denial letter or EOB.",
      },
      { status: 400 }
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();

  if (!apiKey) {
    console.warn(
      "[extract-denial] ANTHROPIC_API_KEY not set — returning mock extraction."
    );
    const response: ExtractDenialApiResponse = {
      ...generateMockExtraction(),
      source: "mock",
    };
    return NextResponse.json(response);
  }

  console.log("[extract-denial] ANTHROPIC_API_KEY detected — calling Claude.");

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");

    const anthropic = new Anthropic({ apiKey });

    const documentBlock =
      mediaType === "application/pdf"
        ? ({
            type: "document" as const,
            source: {
              type: "base64" as const,
              media_type: "application/pdf" as const,
              data: base64,
            },
          } as const)
        : ({
            type: "image" as const,
            source: {
              type: "base64" as const,
              media_type: mediaType as "image/jpeg" | "image/png",
              data: base64,
            },
          } as const);

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2200,
      system: EXTRACT_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [documentBlock, { type: "text", text: EXTRACT_USER_PROMPT }],
        },
      ],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("Claude returned no text content.");
    }

    const extracted = parseExtractionJson(textBlock.text);
    const response: ExtractDenialApiResponse = {
      ...extracted,
      source: "claude",
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Claude extraction error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to extract denial information.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
