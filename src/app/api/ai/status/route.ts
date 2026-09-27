import { NextResponse } from "next/server";

// Which vendor keys are configured on the server. Never returns the keys themselves.
export async function GET() {
  return NextResponse.json({
    GEMINI_API_KEY: Boolean(process.env.GEMINI_API_KEY),
    OPENAI_API_KEY: Boolean(process.env.OPENAI_API_KEY),
    ANTHROPIC_API_KEY: Boolean(process.env.ANTHROPIC_API_KEY),
  });
}
