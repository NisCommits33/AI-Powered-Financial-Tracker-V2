export interface CategoryRule {
  keyword: string;
  category: string;
}

export interface ChatPreferences {
  nickname: string;
  categoryRules: CategoryRule[];
}

const PREFERENCES_KEY = "chat_preferences";
const PINNED_QUESTIONS_KEY = "chat_pinned_questions";

export const defaultChatPreferences: ChatPreferences = {
  nickname: "",
  categoryRules: [],
};

export function loadChatPreferences(): ChatPreferences {
  if (typeof window === "undefined") return defaultChatPreferences;
  try {
    const raw = localStorage.getItem(PREFERENCES_KEY);
    if (!raw) return defaultChatPreferences;
    const parsed = JSON.parse(raw);
    return {
      nickname: typeof parsed.nickname === "string" ? parsed.nickname : "",
      categoryRules: Array.isArray(parsed.categoryRules) ? parsed.categoryRules : [],
    };
  } catch {
    return defaultChatPreferences;
  }
}

export function saveChatPreferences(preferences: ChatPreferences) {
  localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
}

export function loadPinnedQuestions(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PINNED_QUESTIONS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePinnedQuestions(questions: string[]) {
  localStorage.setItem(PINNED_QUESTIONS_KEY, JSON.stringify(questions));
}
