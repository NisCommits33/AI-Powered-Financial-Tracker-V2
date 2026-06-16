import { createClient } from "@/lib/supabase/server";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/categories";

export async function POST(request: Request) {
  const { text } = await request.json();

  if (!text || typeof text !== "string" || !text.trim()) {
    return Response.json({ error: "text is required" }, { status: 400 });
  }

  const apiKey = process.env.GROK_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "AI assistant is not configured" }, { status: 500 });
  }

  const today = new Date().toISOString().split("T")[0];

  const supabase = await createClient();
  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, name")
    .eq("is_archived", false);

  const accountNames = (accounts || []).map((a) => a.name);

  const systemPrompt = `You convert a short natural language description of a financial transaction into structured JSON.
Today's date is ${today}. Use this to resolve relative dates like "yesterday" or "last Friday".

Rules:
- "amount": a number. Use a NEGATIVE number for expenses/spending and a POSITIVE number for income/money received. Never zero.
- "description": a short human-readable description (e.g. merchant or item name).
- "category": if "amount" is negative (an expense), must be exactly one of ${JSON.stringify(EXPENSE_CATEGORIES)}. If "amount" is positive (income), must be exactly one of ${JSON.stringify(INCOME_CATEGORIES)}.
- "date": an ISO date string (YYYY-MM-DD).
- "account": if the text mentions an account name, match it (case-insensitive) to exactly one of these known accounts: ${JSON.stringify(accountNames)}. Otherwise null.

Respond with ONLY a JSON object with keys: amount, description, category, date, account. No extra text.`;

  let response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
    }),
  });

  // If Groq is rate-limited, fall back to Gemini via its OpenAI-compatible endpoint.
  if (!response.ok && response.status === 429 && process.env.GEMINI_API_KEY) {
    response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GEMINI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text },
        ],
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
    });
  }

  if (!response.ok) {
    const errText = await response.text();
    console.error("AI API error:", response.status, errText);
    return Response.json({ error: "Couldn't parse that right now. Try entering it manually." }, { status: 502 });
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content;

  let parsed: { amount?: number; description?: string; category?: string; date?: string; account?: string | null };
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error("nl-parse: invalid JSON from model:", raw);
    return Response.json({ error: "Couldn't understand that. Try entering it manually." }, { status: 502 });
  }

  if (typeof parsed.amount !== "number" || parsed.amount === 0) {
    return Response.json({ error: "Couldn't figure out the amount. Try entering it manually." }, { status: 422 });
  }

  const matchedAccount = (accounts || []).find(
    (a) => a.name.toLowerCase() === (parsed.account || "").toLowerCase()
  );

  const validCategories = parsed.amount < 0 ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  return Response.json({
    amount: parsed.amount,
    description: parsed.description || "",
    category: validCategories.includes(parsed.category || "") ? parsed.category : "Other",
    date: parsed.date && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date) ? parsed.date : today,
    account_id: matchedAccount?.id || null,
  });
}
