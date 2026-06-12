import { createClient } from "@/lib/supabase/server";
import { formatNPR } from "@/lib/utils";

export async function GET() {
  const supabase = await createClient();

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthStart = `${currentMonth}-01`;

  const [{ data: accounts }, { data: budgets }, { data: transactions }] = await Promise.all([
    supabase.from("accounts").select("name, balance").eq("is_archived", false),
    supabase.from("budgets").select("category, monthly_limit, spent, month"),
    supabase
      .from("transactions")
      .select("amount, category, description, date")
      .is("deleted_at", null)
      .gte("date", monthStart)
      .order("date", { ascending: false }),
  ]);

  const suggestions: string[] = [];

  // Recalculate spend per category from actual transactions (stored budget.spent is never updated)
  const spentByCategory = new Map<string, number>();
  for (const t of transactions || []) {
    if (t.amount < 0) {
      spentByCategory.set(t.category, (spentByCategory.get(t.category) || 0) + Math.abs(t.amount));
    }
  }

  // 1. Over-budget categories take top priority
  const overBudget = (budgets || []).filter((b) => {
    if (!b.month?.startsWith(currentMonth)) return false;
    const spent = spentByCategory.get(b.category) || 0;
    return spent > b.monthly_limit;
  });
  for (const b of overBudget) {
    suggestions.push(`I'm over budget on ${b.category} this month — any tips to cut back?`);
  }

  // 2. Categories close to their limit (80%+)
  if (suggestions.length < 3) {
    const nearLimit = (budgets || []).filter((b) => {
      if (!b.month?.startsWith(currentMonth) || b.monthly_limit <= 0) return false;
      const spent = spentByCategory.get(b.category) || 0;
      return spent <= b.monthly_limit && spent / b.monthly_limit >= 0.8;
    });
    for (const b of nearLimit) {
      suggestions.push(`I'm close to my ${b.category} budget limit — how much do I have left?`);
    }
  }

  // 3. Low account balances
  if (suggestions.length < 3) {
    for (const a of accounts || []) {
      if (a.balance < 1000) {
        suggestions.push(`My ${a.name} balance is low (${formatNPR(a.balance)}) — what should I do?`);
      }
    }
  }

  // 4. Top spending category this month
  if (suggestions.length < 3) {
    const top = [...spentByCategory.entries()].sort((a, b) => b[1] - a[1])[0];
    if (top) {
      suggestions.push(`What's driving my ${top[0]} spending this month?`);
    }
  }

  // 5. Biggest single expense this month
  if (suggestions.length < 3) {
    const biggest = (transactions || [])
      .filter((t) => t.amount < 0)
      .sort((a, b) => a.amount - b.amount)[0];
    if (biggest) {
      const label = biggest.description || biggest.category;
      suggestions.push(`Was ${formatNPR(Math.abs(biggest.amount))} on "${label}" a normal expense for me?`);
    }
  }

  // 6. No budgets set at all
  if (suggestions.length < 3 && (!budgets || budgets.length === 0)) {
    suggestions.push("I don't have any budgets set — can you help me create one?");
  }

  // 7. No transactions logged yet this month
  if (suggestions.length < 3 && (!transactions || transactions.length === 0)) {
    suggestions.push("I haven't logged any transactions this month — can you add one for me?");
    if (budgets && budgets.length > 0) {
      const categories = budgets.map((b) => b.category).join(" and ");
      suggestions.push(`I have budgets set for ${categories} — any tips to stick to them?`);
    }
  }

  // Fallbacks to always fill up to 3
  const fallback = [
    "How much did I spend on food this month?",
    "Am I over budget anywhere?",
    "What's my net worth right now?",
  ];
  for (const s of fallback) {
    if (suggestions.length >= 3) break;
    if (!suggestions.includes(s)) suggestions.push(s);
  }

  return Response.json({ suggestions: suggestions.slice(0, 3) });
}
