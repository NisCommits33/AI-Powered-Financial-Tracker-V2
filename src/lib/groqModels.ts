export type AIProvider = "groq" | "cerebras" | "gemini";

export const AVAILABLE_MODELS = [
  { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B (instant)", provider: "groq" },
  { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B (versatile)", provider: "groq" },
  { id: "gemma2-9b-it", label: "Gemma2 9B", provider: "groq" },
  { id: "gpt-oss-120b", label: "GPT-OSS 120B", provider: "cerebras" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", provider: "gemini" },
] as const satisfies ReadonlyArray<{ id: string; label: string; provider: AIProvider }>;

export const PROVIDER_LABELS: Record<AIProvider, string> = {
  groq: "Groq",
  cerebras: "Cerebras",
  gemini: "Gemini",
};

export const DEFAULT_MODEL = AVAILABLE_MODELS[0].id;
