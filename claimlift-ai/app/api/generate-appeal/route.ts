import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import {
  buildUserPrompt,
  generateMockAppeal,
  parseClaudeJson,
  SYSTEM_PROMPT,
} from "@/lib/generateAppeal";
import type {
  GenerateAppealApiResponse,
  GenerateAppealRequest,
} from "@/lib/types";

export async function POST(request: Request) {
  let body: GenerateAppealRequest;

  try {
    body = (await request.json()) as GenerateAppealRequest;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body." },
      { status: 400 }
    );
  }

  if (!body.demoPatientId?.trim() || !body.procedureCode?.trim()) {
    return NextResponse.json(
      { error: "demoPatientId and procedureCode are required." },
      { status: 400 }
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();

  if (!apiKey) {
    console.warn(
      "[generate-appeal] ANTHROPIC_API_KEY not set — returning mock output."
    );
    const mock = generateMockAppeal(body);
    const response: GenerateAppealApiResponse = { ...mock, source: "mock" };
    return NextResponse.json(response);
  }

  console.log("[generate-appeal] ANTHROPIC_API_KEY detected — calling Claude.");

  try {
    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserPrompt(body) }],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("Claude returned no text content.");
    }

    const generated = parseClaudeJson(textBlock.text);
    const response: GenerateAppealApiResponse = {
      ...generated,
      source: "claude",
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Claude API error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate appeal.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
