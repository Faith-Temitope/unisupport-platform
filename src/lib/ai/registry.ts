// Birdie's AI "brains". Each brain is a branded package over one vendor. The student picks a brain
// and a model tier in Settings. Prices, margins and model ids are DEFAULTS: the live values are
// stored in the ai_providers / ai_models tables and edited in the team console.
//
// Price per answer for a student = provider cost (USD) x margin x USD->NGN rate.
// Example: a 10 cent answer with margin 1.75 is charged as 17.5 cents.

export type BrainId = "spark" | "nova" | "sage";
export type Tier = "quick" | "balanced" | "deep";
export type Vendor = "gemini" | "openai" | "anthropic";

export interface BrainModel { tier: Tier; label: string; vendorModel: string; vendorLabel: string; inUsd: number; outUsd: number }
export interface Brain { id: BrainId; brand: string; vendor: Vendor; vendorName: string; free: boolean; margin: number; badge: string; blurb: string; models: BrainModel[] }

export const DEFAULT_USD_NGN = 1500; // editable in the console (app_config.usd_ngn)

export const BRAINS: Brain[] = [
  {
    id: "spark", brand: "Spark", vendor: "gemini", vendorName: "Google Gemini", free: true, margin: 1, badge: "Free",
    blurb: "Fast and free for everyday study. Note: Google may use free-tier prompts to improve its products.",
    models: [
      { tier: "quick", label: "Quick", vendorModel: "gemini-3.5-flash-lite", vendorLabel: "Gemini 3.5 Flash-Lite", inUsd: 0.3, outUsd: 2.5 },
      { tier: "balanced", label: "Balanced", vendorModel: "gemini-3.6-flash", vendorLabel: "Gemini 3.6 Flash", inUsd: 0.75, outUsd: 3.75 },
      { tier: "deep", label: "Deep", vendorModel: "gemini-3.8-flash", vendorLabel: "Gemini 3.8 Flash", inUsd: 0.75, outUsd: 3.75 },
    ],
  },
  {
    id: "nova", brand: "Nova", vendor: "openai", vendorName: "OpenAI ChatGPT", free: false, margin: 1.75, badge: "Low cost",
    blurb: "Sharp reasoning and clear explanations. Pay only for what you use, straight from your Birdie balance.",
    models: [
      { tier: "quick", label: "Quick", vendorModel: "gpt-5.6-luna", vendorLabel: "GPT-5.6 Luna", inUsd: 0.2, outUsd: 1.2 },
      { tier: "balanced", label: "Balanced", vendorModel: "gpt-5.6-terra", vendorLabel: "GPT-5.6 Terra", inUsd: 2, outUsd: 12 },
      { tier: "deep", label: "Deep", vendorModel: "gpt-5.6-sol", vendorLabel: "GPT-5.6 Sol", inUsd: 4, outUsd: 20 },
    ],
  },
  {
    id: "sage", brand: "Sage", vendor: "anthropic", vendorName: "Anthropic Claude", free: false, margin: 1.75, badge: "Low cost",
    blurb: "Careful, grounded answers that stick to your material. Pay only for what you use.",
    models: [
      { tier: "quick", label: "Quick", vendorModel: "claude-haiku-4-5", vendorLabel: "Claude Haiku 4.5", inUsd: 1, outUsd: 5 },
      { tier: "balanced", label: "Balanced", vendorModel: "claude-sonnet-5", vendorLabel: "Claude Sonnet 5", inUsd: 2, outUsd: 10 },
      { tier: "deep", label: "Deep", vendorModel: "claude-opus-5", vendorLabel: "Claude Opus 5", inUsd: 5, outUsd: 25 },
    ],
  },
];

export const brainById = (id: string) => BRAINS.find((b) => b.id === id) ?? BRAINS[0];
export const modelOf = (b: Brain, tier: string) => b.models.find((m) => m.tier === tier) ?? b.models[1];

/** What the student pays for one answer, in NGN. Free brains cost nothing. */
export function priceNgn(b: Brain, m: BrainModel, inTokens: number, outTokens: number, usdNgn = DEFAULT_USD_NGN) {
  const providerUsd = (inTokens / 1e6) * m.inUsd + (outTokens / 1e6) * m.outUsd;
  const chargedUsd = b.free ? 0 : providerUsd * b.margin;
  return { providerUsd, chargedUsd, ngn: Math.round(chargedUsd * usdNgn) };
}

// A typical Birdie answer: ~3,000 tokens of the student's own notes in, ~500 tokens out.
export const TYPICAL = { inTokens: 3000, outTokens: 500 };
