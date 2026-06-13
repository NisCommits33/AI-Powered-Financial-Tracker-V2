export const AVAILABLE_MODELS = [
  { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B (versatile)" },
  { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B (instant)" },
  { id: "gemma2-9b-it", label: "Gemma2 9B" },
] as const;

export const DEFAULT_MODEL = AVAILABLE_MODELS[0].id;
