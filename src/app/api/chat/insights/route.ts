import { createClient } from "@/lib/supabase/server";
import { formatNPR, withComputedSpent, currentMonthStart } from "@/lib/utils";

interface Insight {
  id: string;
  message: string;
}

export async function GET() {
  const supabase = await createClient();

  const monthStart = currentMonthStart();

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  const sixMonthsAgoStr = sixMonthsAgo.toISOString().slice(0, 10);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10);

  const [{ data: accounts }, { data: budgets }, { data: monthTx }, { data: trendTx }] = await Promise.all([
    supabase.from("accounts").select("*").eq("is_archived", false),
    supabase.from("budgets").select("*").eq("month", monthStart),
    supabase.from("transactions").select("*").is("deleted_at", null).gte("date", monthStart),
    supabase.from("transactions").select("*").is("deleted_at", null).gte("date", sixMonthsAgoStr),
  ]);

  const insights: Insight[] = [];
  const trend = trendTx || [];
  const thisMonth = monthTx || [];

  // 1. Weekly digest — income/expenses over the last 7 days.
  const weekTx = trend.filter((t) => t.date.slice(0, 10) >= sevenDaysAgoStr);
  const weekIncome = weekTx.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const weekExpenses = weekTx.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  if (weekIncome > 0 || weekExpenses > 0) {
    insights.push({
      id: "weekly-digest",
      message: `This week you spent ${formatNPR(weekExpenses)} and earned ${formatNPR(weekIncome)}, for a net of ${formatNPR(weekIncome - weekExpenses)}.`,
    });
  }

  // 2. Budget threshold alerts (80%+ of limit, not yet over).
  for (const b of withComputedSpent(budgets || [], thisMonth)) {
    if (b.monthly_limit <= 0) continue;
    const ratio = b.spent / b.monthly_limit;
    if (ratio >= 0.8 && ratio < 1) {
      insights.push({
        id: `budget-${b.category}`,
        message: `You're at ${Math.round(ratio * 100)}% of your ${b.category} budget (${formatNPR(b.spent)} of ${formatNPR(b.monthly_limit)}).`,
      });
    }
  }

  // 3. Unusual spending alerts — this month's category spend vs the monthly
  // average for that category over the trailing 6 months.
  const monthsInWindow = new Set(trend.map((t) => t.date.slice(0, 7))).size || 1;
  const categoryTotals = new Map<string, number>();
  for (const t of trend) {
    if (t.amount >= 0) continue;
    categoryTotals.set(t.category, (categoryTotals.get(t.category) || 0) + Math.abs(t.amount));
  }
  const categoryThisMonth = new Map<string, number>();
  for (const t of thisMonth) {
    if (t.amount >= 0) continue;
    categoryThisMonth.set(t.category, (categoryThisMonth.get(t.category) || 0) + Math.abs(t.amount));
  }
  for (const [category, thisMonthAmount] of categoryThisMonth) {
    const totalAmount = categoryTotals.get(category) || 0;
    // Exclude the current month's own contribution to get a baseline average.
    const priorAverage = (totalAmount - thisMonthAmount) / Math.max(monthsInWindow - 1, 1);
    if (priorAverage > 0 && thisMonthAmount >= priorAverage * 2 && thisMonthAmount - priorAverage >= 500) {
      const multiple = thisMonthAmount / priorAverage;
      insights.push({
        id: `unusual-${category}`,
        message: `You've spent ${formatNPR(thisMonthAmount)} on ${category} this month — about ${multiple.toFixed(1)}x your usual ${formatNPR(priorAverage)}.`,
      });
    }
  }

  // 4. Savings streak — consecutive completed months (most recent first,
  // excluding the current in-progress month) where income exceeded expenses.
  const monthlyTotals = new Map<string, { income: number; expenses: number }>();
  for (const t of trend) {
    const key = t.date.slice(0, 7);
    const entry = monthlyTotals.get(key) || { income: 0, expenses: 0 };
    if (t.amount > 0) entry.income += t.amount;
    else entry.expenses += Math.abs(t.amount);
    monthlyTotals.set(key, entry);
  }
  const currentMonthKey = monthStart.slice(0, 7);
  const completedMonths = [...monthlyTotals.entries()]
    .filter(([month]) => month !== currentMonthKey)
    .sort(([a], [b]) => b.localeCompare(a));
  let streak = 0;
  for (const [, totals] of completedMonths) {
    if (totals.income > totals.expenses) streak++;
    else break;
  }
  if (streak >= 2) {
    insights.push({
      id: "savings-streak",
      message: `You've spent less than you earned for ${streak} months in a row. Keep it up!`,
    });
  }

  // 5. Idle cash suggestions — savings accounts holding more than 6 months of
  // average expenses could be earning more in a fixed deposit.
  const avgMonthlyExpenses = completedMonths.length
    ? completedMonths.reduce((s, [, t]) => s + t.expenses, 0) / completedMonths.length
    : 0;
  if (avgMonthlyExpenses > 0) {
    for (const a of accounts || []) {
      if (a.type === "savings" && a.balance > avgMonthlyExpenses * 6) {
        insights.push({
          id: `idle-cash-${a.id}`,
          message: `Your ${a.name} balance (${formatNPR(a.balance)}) covers over 6 months of expenses — consider moving some into a fixed deposit or investment.`,
        });
      }
    }
  }

  // 6. Bill due reminders — recurring-tagged expenses due again within 3 days,
  // based on their most recent occurrence recurring monthly.
  const recurringLatest = new Map<string, { description: string; category: string; amount: number; date: string }>();
  for (const t of trend) {
    if (t.amount >= 0 || !t.tags?.includes("recurring")) continue;
    const key = t.description || t.category;
    const existing = recurringLatest.get(key);
    if (!existing || t.date > existing.date) {
      recurringLatest.set(key, { description: t.description || t.category, category: t.category, amount: t.amount, date: t.date });
    }
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (const r of recurringLatest.values()) {
    const last = new Date(r.date);
    const nextDue = new Date(last);
    nextDue.setMonth(nextDue.getMonth() + 1);
    const daysUntil = Math.round((nextDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil >= 0 && daysUntil <= 3) {
      const when = daysUntil === 0 ? "today" : daysUntil === 1 ? "in 1 day" : `in ${daysUntil} days`;
      insights.push({
        id: `bill-${r.description}`,
        message: `Your ${r.description} payment (${formatNPR(Math.abs(r.amount))}) is due ${when}.`,
      });
    }
  }

  return Response.json({ insights: insights.slice(0, 5) });
}
