import { createClient } from "@/lib/supabase/server";
import { formatNPR, withComputedSpent, currentMonthStart } from "@/lib/utils";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, ALL_CATEGORIES } from "@/lib/categories";
import { AVAILABLE_MODELS, DEFAULT_MODEL, type AIProvider } from "@/lib/groqModels";

const ACCOUNT_TYPES = ["checking", "savings", "cash", "ewallet"];

const ACCENT_COLORS = ["green", "terracotta", "blue", "purple"];

const CARD_STYLES = ["flat", "elevated", "outlined", "soft"];

const BUTTON_RADII = ["none", "sm", "lg", "full"];

const THEME_MODES = ["light", "dark"];

const CHART_IDS = [
  "cashflow",
  "category",
  "netWorthTrend",
  "accountDistribution",
  "budgetUsage",
  "dailySpending",
  "incomeExpenseRatio",
  "topMerchants",
  "yearOverYear",
  "weeklyHeatmap",
  "recurringVsOneTime",
  "savingsGoalProgress",
];

const tools = [
  {
    type: "function",
    function: {
      name: "create_transaction",
      description: "Log a new income or expense transaction for the user.",
      parameters: {
        type: "object",
        properties: {
          amount: { type: ["number", "string"], description: "Negative for expenses/spending, positive for income." },
          description: { type: "string", description: "Short description, e.g. merchant or item name." },
          category: {
            type: "string",
            enum: ALL_CATEGORIES,
            description: `If amount is negative, must be one of ${JSON.stringify(EXPENSE_CATEGORIES)}. If amount is positive, must be one of ${JSON.stringify(INCOME_CATEGORIES)}.`,
          },
          date: { type: "string", description: "ISO date YYYY-MM-DD" },
          account_name: { type: "string", description: "Name of the account mentioned by the user, if any." },
          recurring: { type: "boolean", description: "True if the user describes this as a recurring/repeating transaction (e.g. rent, subscription, salary every month)." },
        },
        required: ["amount", "description", "category", "date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_account",
      description: "Create a new financial account (e.g. bank account, wallet, cash).",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          type: { type: "string", enum: ACCOUNT_TYPES },
          balance: { type: ["number", "string"], description: "Starting balance, defaults to 0 if not mentioned." },
          currency: { type: "string", description: "3-letter currency code, defaults to NPR." },
          color_tag: { type: "string", description: "Optional hex color for the account, e.g. #16a34a" },
        },
        required: ["name", "type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_budget",
      description: "Set or update the monthly spending limit for a category.",
      parameters: {
        type: "object",
        properties: {
          category: { type: "string", enum: EXPENSE_CATEGORIES },
          monthly_limit: { type: ["number", "string"] },
          month: { type: "string", description: "ISO date for the first day of the target month, YYYY-MM-01. Defaults to the current month." },
        },
        required: ["category", "monthly_limit"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_account_balance",
      description: "Correct or update the balance of an existing account.",
      parameters: {
        type: "object",
        properties: {
          account_name: { type: "string", description: "Name of the account to update." },
          balance: { type: ["number", "string"], description: "The new balance for the account." },
        },
        required: ["account_name", "balance"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "edit_transaction",
      description: "Edit an existing transaction. Only include fields that should change.",
      parameters: {
        type: "object",
        properties: {
          transaction_id: { type: "string", description: "The id of the transaction to edit, from the Recent Transactions list." },
          amount: { type: ["number", "string"], description: "Negative for expenses, positive for income." },
          description: { type: "string" },
          category: {
            type: "string",
            enum: ALL_CATEGORIES,
            description: `If amount is negative, must be one of ${JSON.stringify(EXPENSE_CATEGORIES)}. If amount is positive, must be one of ${JSON.stringify(INCOME_CATEGORIES)}.`,
          },
          date: { type: "string", description: "ISO date YYYY-MM-DD" },
        },
        required: ["transaction_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_transaction",
      description: "Delete (soft-delete) an existing transaction.",
      parameters: {
        type: "object",
        properties: {
          transaction_id: { type: "string", description: "The id of the transaction to delete, from the Recent Transactions list." },
        },
        required: ["transaction_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_card_style",
      description: "Change the visual style of cards/panels across the app.",
      parameters: {
        type: "object",
        properties: {
          style: { type: "string", enum: CARD_STYLES },
        },
        required: ["style"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_button_radius",
      description: "Change the corner roundness of buttons across the app.",
      parameters: {
        type: "object",
        properties: {
          radius: { type: "string", enum: BUTTON_RADII },
        },
        required: ["radius"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_theme_mode",
      description: "Switch the app between light and dark mode.",
      parameters: {
        type: "object",
        properties: {
          mode: { type: "string", enum: THEME_MODES },
        },
        required: ["mode"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_accent_color",
      description: "Change the app's accent/theme color.",
      parameters: {
        type: "object",
        properties: {
          color: { type: "string", enum: ACCENT_COLORS },
        },
        required: ["color"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "show_chart",
      description: "Display an inline chart in the chat to visually answer the user's question. Use this alongside a short text answer when a chart would help (spending breakdown, trends over time).",
      parameters: {
        type: "object",
        properties: {
          chart_type: {
            type: "string",
            enum: ["category_breakdown", "spending_trend"],
            description: "category_breakdown: pie chart of this month's spending by category. spending_trend: bar chart of income vs expenses for the last 6 months.",
          },
          title: { type: "string", description: "Short title for the chart." },
        },
        required: ["chart_type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "show_table",
      description: "Display an inline table in the chat to answer questions that have multiple rows of data (e.g. budget breakdown, spending by category, a list of recent transactions). Use this alongside a short text answer instead of writing out a long list in prose.",
      parameters: {
        type: "object",
        properties: {
          table_type: {
            type: "string",
            enum: ["budget_breakdown", "category_breakdown", "recent_transactions"],
            description: "budget_breakdown: each budget's spent vs limit. category_breakdown: this month's spending by category. recent_transactions: the most recent transactions.",
          },
          title: { type: "string", description: "Short title for the table." },
        },
        required: ["table_type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "transfer_funds",
      description: "Move money from one of the user's accounts to another (e.g. 'move 5000 from Cash to Savings'). Creates a paired expense/income transaction and updates both account balances.",
      parameters: {
        type: "object",
        properties: {
          from_account_name: { type: "string", description: "Name of the account to transfer money out of." },
          to_account_name: { type: "string", description: "Name of the account to transfer money into." },
          amount: { type: ["number", "string"], description: "Amount to transfer. Always positive." },
          date: { type: "string", description: "ISO date YYYY-MM-DD. Defaults to today if not mentioned." },
        },
        required: ["from_account_name", "to_account_name", "amount"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_goal",
      description: "Create a new savings goal for the user (e.g. 'Create a savings goal of 100000 for a trip by December').",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Short name for the goal, e.g. 'Trip to Pokhara' or 'Emergency Fund'." },
          target_amount: { type: ["number", "string"], description: "The amount the user wants to save in total." },
          target_date: { type: "string", description: "ISO date YYYY-MM-DD the user wants to reach this goal by, if mentioned." },
          current_amount: { type: ["number", "string"], description: "Amount already saved toward this goal, if mentioned. Defaults to 0." },
        },
        required: ["name", "target_amount"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "contribute_to_goal",
      description: "Add or withdraw funds from an existing savings goal (e.g. 'add 5000 to my Emergency Fund goal').",
      parameters: {
        type: "object",
        properties: {
          goal_name: { type: "string", description: "Name of the goal to update (matched against the user's existing goals)." },
          amount: { type: ["number", "string"], description: "Amount to add to the goal's saved total. Use a negative number to withdraw." },
        },
        required: ["goal_name", "amount"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_debt",
      description: "Record a new debt or loan: either money the user borrowed (they owe someone) or money the user lent to someone (owed to them).",
      parameters: {
        type: "object",
        properties: {
          person: { type: "string", description: "Name of the person, bank, or lender involved." },
          direction: { type: "string", enum: ["owed_by_me", "owed_to_me"], description: "'owed_by_me' if the user borrowed money, 'owed_to_me' if the user lent money." },
          principal_amount: { type: ["number", "string"], description: "The total amount of the loan." },
          interest_rate: { type: ["number", "string"], description: "Annual interest rate percentage, if mentioned." },
          due_date: { type: "string", description: "ISO date YYYY-MM-DD this should be repaid by, if mentioned." },
          notes: { type: "string", description: "Any extra context, e.g. reason for the loan." },
        },
        required: ["person", "direction", "principal_amount"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "record_debt_payment",
      description: "Record a payment made toward an existing debt or loan, reducing its remaining balance (e.g. 'I paid back 5000 to Ramesh').",
      parameters: {
        type: "object",
        properties: {
          person: { type: "string", description: "Name of the person/lender on the debt record (matched against existing debts)." },
          amount: { type: ["number", "string"], description: "Amount paid toward the balance. Always positive." },
        },
        required: ["person", "amount"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_dashboard_charts",
      description: "Choose which charts are shown on the dashboard, and in what set. Replaces the current selection.",
      parameters: {
        type: "object",
        properties: {
          charts: {
            type: "array",
            items: { type: "string", enum: CHART_IDS },
            description: "List of chart ids to enable on the dashboard.",
          },
        },
        required: ["charts"],
      },
    },
  },
];

export async function POST(request: Request) {
  const { messages, model, preferences } = await request.json();
  const nickname: string | undefined = preferences?.nickname?.trim() || undefined;
  const categoryRules: { keyword: string; category: string }[] = Array.isArray(preferences?.categoryRules)
    ? preferences.categoryRules.filter((r: any) => r?.keyword && r?.category)
    : [];

  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "messages is required" }, { status: 400 });
  }

  const selectedEntry = AVAILABLE_MODELS.find((m) => m.id === model);
  const selectedModel = selectedEntry ? model : DEFAULT_MODEL;
  const selectedProvider: AIProvider = selectedEntry?.provider ?? "groq";

  // Per-provider connection details. `keys` is read per-request so newly added
  // env vars take effect without a rebuild. `defaultModel` is used when this
  // provider is reached as a fallback (the user's chosen model id only makes
  // sense for its own provider).
  const PROVIDERS: Record<AIProvider, { url: string; keys: string[]; defaultModel: string }> = {
    groq: {
      url: "https://api.groq.com/openai/v1/chat/completions",
      keys: [process.env.GROK_API_KEY, process.env.GROK_API_KEY_2].filter((k): k is string => !!k),
      defaultModel: DEFAULT_MODEL,
    },
    cerebras: {
      url: "https://api.cerebras.ai/v1/chat/completions",
      keys: [process.env.CEREBRAS_API_KEY].filter((k): k is string => !!k),
      defaultModel: "gpt-oss-120b",
    },
    gemini: {
      url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      keys: [process.env.GEMINI_API_KEY].filter((k): k is string => !!k),
      defaultModel: "gemini-2.5-flash",
    },
  };

  // Try the user's chosen provider first, then the others as rate-limit fallbacks.
  const providerOrder: AIProvider[] = [
    selectedProvider,
    ...(["groq", "cerebras", "gemini"] as AIProvider[]).filter((p) => p !== selectedProvider),
  ];

  if (providerOrder.every((p) => PROVIDERS[p].keys.length === 0)) {
    return Response.json({ error: "AI assistant is not configured" }, { status: 500 });
  }

  const supabase = await createClient();

  const monthStart = currentMonthStart();

  // Start of the 6-month window (inclusive of the current month) for trend analysis.
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  const sixMonthsAgoStr = sixMonthsAgo.toISOString().slice(0, 10);

  const [{ data: accounts }, { data: transactions }, { data: monthTx }, { data: budgets }, { data: trendTx }, { data: goals }, { data: debts }] =
    await Promise.all([
      supabase.from("accounts").select("*").eq("is_archived", false),
      // Recent transactions for the display list / edit + delete id lookups.
      supabase
        .from("transactions")
        .select("*")
        .is("deleted_at", null)
        .order("date", { ascending: false })
        .limit(100),
      // The full current month (no 100 cap) so income/expense totals and budget
      // "spent" are accurate even for high-volume months. Filtered by date string
      // to avoid timezone drift from parsing dates through `new Date`.
      supabase
        .from("transactions")
        .select("*")
        .is("deleted_at", null)
        .gte("date", monthStart),
      supabase.from("budgets").select("*").eq("month", monthStart),
      // Last 6 months of transactions for trend/comparison questions and the
      // spending_trend chart.
      supabase
        .from("transactions")
        .select("*")
        .is("deleted_at", null)
        .gte("date", sixMonthsAgoStr),
      supabase.from("goals").select("*").eq("is_completed", false),
      supabase.from("debts").select("*").eq("is_settled", false),
    ]);

  const netWorth = (accounts || []).reduce((sum, a) => sum + (a.balance || 0), 0);

  const thisMonthTx = monthTx || [];
  const income = thisMonthTx.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const expenses = thisMonthTx.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

  // Group the last 6 months of transactions by YYYY-MM for trend summaries/charts.
  const monthlyTotals = new Map<string, { income: number; expenses: number }>();
  for (const t of trendTx || []) {
    const key = t.date.slice(0, 7);
    const entry = monthlyTotals.get(key) || { income: 0, expenses: 0 };
    if (t.amount > 0) entry.income += t.amount;
    else entry.expenses += Math.abs(t.amount);
    monthlyTotals.set(key, entry);
  }
  const monthlyTrend = [...monthlyTotals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, totals]) => ({ month, ...totals }));

  const monthlyTrendSummary =
    monthlyTrend.map((m) => `- ${m.month}: Income ${formatNPR(m.income)}, Expenses ${formatNPR(m.expenses)}`).join("\n") ||
    "No transaction history yet.";

  // Average monthly net savings/expenses over the trend window, for forecast
  // and cash-flow-runway questions.
  const avgMonthlyIncome = monthlyTrend.length
    ? monthlyTrend.reduce((s, m) => s + m.income, 0) / monthlyTrend.length
    : 0;
  const avgMonthlyExpenses = monthlyTrend.length
    ? monthlyTrend.reduce((s, m) => s + m.expenses, 0) / monthlyTrend.length
    : 0;
  const avgMonthlySavings = avgMonthlyIncome - avgMonthlyExpenses;
  const cashFlowRunwayMonths =
    avgMonthlyExpenses > 0 ? (netWorth / avgMonthlyExpenses).toFixed(1) : "N/A";
  const savingsRatePercent =
    avgMonthlyIncome > 0 ? ((avgMonthlySavings / avgMonthlyIncome) * 100).toFixed(1) : "N/A";

  // Weekend vs weekday spending, for personalized coaching tips
  // ("You spend 40% more on weekends").
  let weekendSpend = 0;
  let weekdaySpend = 0;
  let weekendDays = 0;
  let weekdayDays = 0;
  for (const t of trendTx || []) {
    if (t.amount >= 0) continue;
    const day = new Date(t.date).getDay();
    if (day === 0 || day === 6) weekendSpend += Math.abs(t.amount);
    else weekdaySpend += Math.abs(t.amount);
  }
  for (let d = new Date(sixMonthsAgoStr); d <= new Date(); d.setDate(d.getDate() + 1)) {
    const day = d.getDay();
    if (day === 0 || day === 6) weekendDays++;
    else weekdayDays++;
  }
  const avgWeekendDailySpend = weekendDays > 0 ? weekendSpend / weekendDays : 0;
  const avgWeekdayDailySpend = weekdayDays > 0 ? weekdaySpend / weekdayDays : 0;
  const weekendVsWeekdaySummary =
    avgWeekdayDailySpend > 0 || avgWeekendDailySpend > 0
      ? `Average daily spending (last 6 months): Weekday ${formatNPR(avgWeekdayDailySpend)}, Weekend ${formatNPR(avgWeekendDailySpend)}`
      : "No transaction history yet.";

  // Category totals per month, for category deep-dive / "why did X spike" questions.
  const categoryByMonth = new Map<string, Map<string, number>>();
  for (const t of trendTx || []) {
    if (t.amount >= 0) continue;
    const monthKey = t.date.slice(0, 7);
    const monthMap = categoryByMonth.get(monthKey) || new Map<string, number>();
    monthMap.set(t.category, (monthMap.get(t.category) || 0) + Math.abs(t.amount));
    categoryByMonth.set(monthKey, monthMap);
  }
  const categoryByMonthSummary =
    [...categoryByMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, cats]) => {
        const line = [...cats.entries()]
          .sort(([, a], [, b]) => b - a)
          .map(([cat, amt]) => `${cat} ${formatNPR(amt)}`)
          .join(", ");
        return `- ${month}: ${line}`;
      })
      .join("\n") || "No transaction history yet.";

  // Simple spending persona derived from the data, for personalization.
  const personaTraits: string[] = [];
  if (avgWeekendDailySpend > avgWeekdayDailySpend * 1.3 && avgWeekendDailySpend > 0) {
    const pct = Math.round((avgWeekendDailySpend / avgWeekdayDailySpend - 1) * 100);
    personaTraits.push(`"Weekend spender" — spends about ${pct}% more per day on weekends than weekdays`);
  } else if (avgWeekdayDailySpend > avgWeekendDailySpend * 1.3 && avgWeekdayDailySpend > 0) {
    const pct = Math.round((avgWeekdayDailySpend / avgWeekendDailySpend - 1) * 100);
    personaTraits.push(`"Weekday spender" — spends about ${pct}% more per day on weekdays than weekends`);
  }
  const totalExpensesTrend = [...categoryByMonth.values()].reduce(
    (sum, cats) => sum + [...cats.values()].reduce((s, v) => s + v, 0),
    0
  );
  const categoryGrandTotals = new Map<string, number>();
  for (const cats of categoryByMonth.values()) {
    for (const [cat, amt] of cats) {
      categoryGrandTotals.set(cat, (categoryGrandTotals.get(cat) || 0) + amt);
    }
  }
  const topCategoryEntry = [...categoryGrandTotals.entries()].sort(([, a], [, b]) => b - a)[0];
  if (topCategoryEntry && totalExpensesTrend > 0) {
    const [topCategory, topAmount] = topCategoryEntry;
    const pct = Math.round((topAmount / totalExpensesTrend) * 100);
    if (pct >= 30) {
      personaTraits.push(`"${topCategory} spender" — ${topCategory} makes up ~${pct}% of total spending over the last 6 months`);
    }
  }
  const personaSummary = personaTraits.length ? personaTraits.join("; ") : "No strong spending pattern detected yet.";

  // Recurring-tagged transactions: most recent occurrence of each, for the
  // subscription/recurring-charge audit.
  const recurringByDescription = new Map<string, { description: string; category: string; amount: number; date: string }>();
  for (const t of trendTx || []) {
    if (t.amount >= 0 || !t.tags?.includes("recurring")) continue;
    const key = t.description || t.category;
    const existing = recurringByDescription.get(key);
    if (!existing || t.date > existing.date) {
      recurringByDescription.set(key, { description: t.description || t.category, category: t.category, amount: t.amount, date: t.date });
    }
  }
  const recurringList = [...recurringByDescription.values()];
  const recurringTotal = recurringList.reduce((s, t) => s + Math.abs(t.amount), 0);
  const recurringSummary =
    recurringList
      .map((t) => `- ${t.description} (${t.category}): ${formatNPR(Math.abs(t.amount))} / month`)
      .join("\n") + (recurringList.length ? `\nTotal recurring: ${formatNPR(recurringTotal)} / month` : "") ||
    "No recurring transactions tagged yet.";

  // This month's spending by category, for the category_breakdown chart.
  const categoryTotals = new Map<string, number>();
  for (const t of thisMonthTx) {
    if (t.amount >= 0) continue;
    categoryTotals.set(t.category, (categoryTotals.get(t.category) || 0) + Math.abs(t.amount));
  }
  const categoryBreakdown = [...categoryTotals.entries()]
    .sort(([, a], [, b]) => b - a)
    .map(([name, value]) => ({ name, value }));

  const accountsSummary = (accounts || [])
    .map((a) => `- ${a.name} (${a.type}): ${formatNPR(a.balance)}`)
    .join("\n") || "No accounts yet.";

  const budgetsSummary = withComputedSpent(budgets || [], thisMonthTx)
    .map((b) => `- ${b.category}: ${formatNPR(b.spent)} of ${formatNPR(b.monthly_limit)} (${b.month})`)
    .join("\n") || "No budgets set.";

  const goalsSummary = (goals || [])
    .map((g) => `- ${g.name}: ${formatNPR(g.current_amount)} of ${formatNPR(g.target_amount)}${g.target_date ? ` (by ${g.target_date})` : ""}`)
    .join("\n") || "No active savings goals.";

  const debtsSummary = (debts || [])
    .map((d) => `- ${d.person}: ${d.direction === "owed_by_me" ? "you owe" : "owed to you"} ${formatNPR(d.remaining_amount)} of ${formatNPR(d.principal_amount)}${d.interest_rate ? ` @ ${d.interest_rate}%` : ""}${d.due_date ? ` (due ${d.due_date})` : ""}`)
    .join("\n") || "No active debts or loans.";

  const recentTxSummary = (transactions || [])
    .slice(0, 30)
    .map(
      (t) =>
        `- id:${t.id} | ${t.date.slice(0, 10)} | ${t.category} | ${t.description || ""} | ${formatNPR(t.amount)}${t.is_anomaly ? " | [flagged as anomaly]" : ""}`
    )
    .join("\n") || "No transactions yet.";

  // Pre-built rows for the show_table tool.
  const budgetTableRows = withComputedSpent(budgets || [], thisMonthTx).map((b) => [
    b.category,
    formatNPR(b.spent),
    formatNPR(b.monthly_limit),
    `${b.monthly_limit ? Math.round((b.spent / b.monthly_limit) * 100) : 0}%`,
  ]);
  const categoryTableRows = categoryBreakdown.map((c) => [c.name, formatNPR(c.value)]);
  const recentTxTableRows = (transactions || [])
    .slice(0, 10)
    .map((t) => [t.date.slice(0, 10), t.category, t.description || "", formatNPR(t.amount)]);

  const todayStr = new Date().toISOString().split("T")[0];

  const categoryRulesSummary = categoryRules.length
    ? categoryRules.map((r) => `- If the description contains "${r.keyword}", use category "${r.category}".`).join("\n")
    : "";

  // Cheap intent pre-check on the latest user message — only pull in the
  // heavier analytical snapshot sections when they're actually relevant,
  // since most messages (e.g. "add Rs.500 lunch") never need them.
  const lastUserMessage = (
    [...messages].reverse().find((m: { role: string; content: string }) => m.role === "user")?.content || ""
  ).toLowerCase();

  const wantsForecast =
    /trend|forecast|project|runway|afford|survive|how long|save up|by next|month.over.month|compare.*month|last 6 month|six month/.test(
      lastUserMessage
    );
  const wantsCategoryDetail = /categor|spike|breakdown|spending on|why (did|is|was|are)/.test(lastUserMessage);
  const wantsRecurring = /recurring|subscription|bills?/.test(lastUserMessage);
  const wantsPatterns = /weekend|weekday|persona|spender|habit|pattern/.test(lastUserMessage);

  const snapshotExtras = [
    wantsForecast
      ? `\n### Monthly Income vs Expenses (Last 6 Months)\n${monthlyTrendSummary}\n\n### Forecast Data\nAverage Monthly Income: ${formatNPR(avgMonthlyIncome)}\nAverage Monthly Expenses: ${formatNPR(avgMonthlyExpenses)}\nAverage Monthly Net Savings: ${formatNPR(avgMonthlySavings)}\nSavings Rate: ${savingsRatePercent}% (Average Monthly Net Savings / Average Monthly Income)\nEstimated Cash Flow Runway: ${cashFlowRunwayMonths} months (Net Worth / Average Monthly Expenses)`
      : "",
    wantsCategoryDetail
      ? `\n### Category Spending by Month (Last 6 Months)\n${categoryByMonthSummary}`
      : "",
    wantsRecurring ? `\n### Recurring Transactions\n${recurringSummary}` : "",
    wantsPatterns
      ? `\n### Spending Patterns\n${weekendVsWeekdaySummary}\nDetected persona traits: ${personaSummary}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const systemPrompt = `You are FinWise, a friendly, concise, and reliable personal finance assistant embedded inside the user's finance tracker application.

Today's date is ${todayStr}.
${nickname ? `\nThe user prefers to be called "${nickname}". Address them by this name occasionally where it feels natural.\n` : ""}
The financial data below is the ONLY source of truth. All amounts are in Nepali Rupees (NPR).

GENERAL RULES
- Answer using only the provided financial data and the current conversation.
- Be concise and use simple, natural language.
- Format currency using the same NPR format already present in the data.
- Never invent transactions, balances, budgets, categories, accounts, or statistics.
- If the provided data is insufficient, explicitly say you do not have enough information instead of guessing.
- Perform calculations only from the supplied data.
- You may use Markdown (bold, bullet/numbered lists, headings, tables) to structure longer answers — keep it light and only when it improves clarity.

TOOL USAGE

You may perform actions by calling available tools.

Available actions include:
- Create (log) transactions
- Edit transactions
- Delete transactions
- Create accounts
- Update account balances
- Set or update budgets
- Change appearance settings (accent color, card style, button shape, theme mode, dashboard charts)
- Show an inline chart (category breakdown or 6-month income/expense trend)

IMPORTANT:
Call a tool ONLY when the user is explicitly requesting an action to be performed NOW (e.g. "add a Rs.500
lunch expense", "set my food budget to 12000", "switch to dark mode", "transfer 2000 from Cash to Savings",
"create a savings goal of 100000 for a trip"). Pure questions, analysis, advice, or "what-if" requests
("how can I save money?", "why are my expenses high?", "if I cut dining out by 30%, how much would I save?")
should get a text-only answer — do not call a tool for these unless the user also explicitly asks for a
chart or table. If intent is ambiguous, assume informational and don't call a tool.

For informational and "what-if" questions, answer using the data sections below with simple arithmetic —
don't call a tool just to answer a question. Key sections to use:
- Category Spending by Month — for "why did X spike" / category deep-dives.
- Recent Transactions — for anomaly explanations (entries marked "[flagged as anomaly]") and recent-activity questions.
- Average Monthly Income/Expenses/Savings & Estimated Cash Flow Runway — for forecasts, projections, and "how long would my money last" questions.
- Recurring Transactions — for subscription/recurring-charge audits.
- Spending Patterns (weekday vs weekend, persona traits) — for personalized habit/persona questions; don't invent a persona if none was detected.
- Savings Rate — for "what's my savings rate / is it good" (rough benchmark: <10% low, 10-20% reasonable, >20% strong — frame as general guidance).

General financial-literacy questions (e.g. "what does APR mean?", debt payoff strategies in general) can be
answered from your own knowledge, kept concise; note if the app doesn't track the relevant data (e.g. no
loan/credit accounts yet).

When a user clearly requests an action:
- Call the appropriate tool immediately.
- do not ask for confirmation.
- The application will present its own confirmation UI.

You may call multiple tools only when the user explicitly requests multiple separate actions.

TRANSACTION RULES

For edit_transaction and delete_transaction:
- Always locate the matching transaction in the Recent Transactions list.
- Use its exact id as transaction_id.
- Never fabricate or guess an ID.

For create_transaction:
- Always provide account_name.
- Use the account specified by the user.
- If omitted, choose the most appropriate existing account.
- Every transaction must affect an account balance.
- Set recurring: true if the user describes the transaction as repeating (rent, subscriptions, salary, "every month", etc.). The first occurrence is logged now, dated as the user specifies.
${categoryRulesSummary ? `- The user has set these custom categorization rules. Apply them before falling back to your own judgment:\n${categoryRulesSummary}` : ""}

## Financial Snapshot

### Net Worth
${formatNPR(netWorth)}

### This Month
Income: ${formatNPR(income)}
Expenses: ${formatNPR(expenses)}

### Accounts
${accountsSummary}

### Budgets
${budgetsSummary}

### Savings Goals
${goalsSummary}

### Debts & Loans
${debtsSummary}

### Recent Transactions (Most Recent First)
${recentTxSummary}

Savings Rate: ${savingsRatePercent}%
${snapshotExtras}`;

  // Cap conversation history sent to the model — older turns rarely matter for
  // the current request and the financial snapshot above already gives the
  // model fresh context each time, so unbounded history is pure token cost.
  const MAX_HISTORY_MESSAGES = 12;
  const recentMessages = messages.slice(-MAX_HISTORY_MESSAGES);

  const groqMessages = [
    { role: "system", content: systemPrompt },
    ...recentMessages.map((m: { role: string; content: string }) => ({ role: m.role, content: m.content })),
  ];

  const baseRequest = {
    messages: groqMessages,
    temperature: 0.4,
    tools,
    tool_choice: "auto",
    stream: true,
  };

  // Route to the user's chosen provider first; on rate-limit (429), fall through
  // to the next configured provider (each using its own default model). All three
  // providers expose an OpenAI-compatible chat-completions API, so the request
  // and streaming response shapes are identical.
  let response: Response | null = null;
  let usedModel = selectedModel;
  for (const providerId of providerOrder) {
    const provider = PROVIDERS[providerId];
    if (provider.keys.length === 0) continue;

    // Use the chosen model id for its own provider; the provider's default otherwise.
    const modelForProvider = providerId === selectedProvider ? selectedModel : provider.defaultModel;
    const body = JSON.stringify({ ...baseRequest, model: modelForProvider });

    // Try each key for this provider; advance to the next key only on 429.
    for (const key of provider.keys) {
      const attempt = await fetch(provider.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body,
      });
      response = attempt;
      usedModel = modelForProvider;
      if (attempt.ok || attempt.status !== 429) break;
    }

    // Move on to the next provider only when this one is rate-limited.
    if (response && (response.ok || response.status !== 429)) break;
  }

  if (!response || !response.ok || !response.body) {
    const errText = await response?.text();
    console.error("Chat API error:", response?.status, errText);
    const message =
      response?.status === 429
        ? "The AI assistant has hit its daily usage limit. Please try again later."
        : "The AI assistant is having trouble responding right now.";
    return Response.json({ error: message }, { status: 502 });
  }

  const encoder = new TextEncoder();
  const groqBody = response.body;

  // Groq returns its current rate-limit/quota state on every response via
  // these headers; surface them so the UI can show remaining usage. `usedModel`
  // reflects the model that actually answered (may differ from the chosen one
  // if we fell through to a fallback provider).
  const usage = {
    model: usedModel,
    limitRequests: response.headers.get("x-ratelimit-limit-requests"),
    remainingRequests: response.headers.get("x-ratelimit-remaining-requests"),
    limitTokens: response.headers.get("x-ratelimit-limit-tokens"),
    remainingTokens: response.headers.get("x-ratelimit-remaining-tokens"),
    resetTokens: response.headers.get("x-ratelimit-reset-tokens"),
  };

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };

      send({ type: "usage", usage });

      const reader = groqBody.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let replyText = "";
      // Accumulate streamed tool-call fragments by index.
      const toolCallsAcc: { id: string; name: string; arguments: string }[] = [];

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const dataStr = trimmed.slice(5).trim();
            if (dataStr === "[DONE]") continue;

            let chunk: any;
            try {
              chunk = JSON.parse(dataStr);
            } catch {
              continue;
            }

            const delta = chunk.choices?.[0]?.delta;
            if (delta?.content) {
              replyText += delta.content;
              send({ type: "content", text: delta.content });
            }
            if (delta?.tool_calls) {
              for (const tc of delta.tool_calls) {
                const idx = tc.index ?? 0;
                if (!toolCallsAcc[idx]) toolCallsAcc[idx] = { id: "", name: "", arguments: "" };
                if (tc.id) toolCallsAcc[idx].id = tc.id;
                if (tc.function?.name) toolCallsAcc[idx].name += tc.function.name;
                if (tc.function?.arguments) toolCallsAcc[idx].arguments += tc.function.arguments;
              }
            }
          }
        }
      } catch (err) {
        console.error("Groq stream error:", err);
      }

      // Build confirmation-card actions from the fully-accumulated tool calls.
      let visualSent = false;
      const actions: { id: string; type: string; args: Record<string, unknown> }[] = [];
      for (const call of toolCallsAcc) {
        if (!call || !call.name) continue;
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(call.arguments);
        } catch {
          continue;
        }

        // Charts are purely informational (no confirmation needed) — compute the
        // data server-side from the snapshot already fetched and send it directly.
        if (call.name === "show_chart") {
          const chartType = args.chart_type;
          if (chartType === "category_breakdown") {
            send({
              type: "chart",
              chart: { chart_type: chartType, title: args.title || "Spending by Category", data: categoryBreakdown },
            });
            visualSent = true;
          } else if (chartType === "spending_trend") {
            send({
              type: "chart",
              chart: { chart_type: chartType, title: args.title || "Income vs Expenses (Last 6 Months)", data: monthlyTrend },
            });
            visualSent = true;
          }
          continue;
        }

        // Tables are purely informational (no confirmation needed) — same pattern as show_chart.
        if (call.name === "show_table") {
          const tableType = args.table_type;
          if (tableType === "budget_breakdown") {
            send({
              type: "table",
              table: {
                title: args.title || "Budget Breakdown",
                columns: ["Category", "Spent", "Limit", "% Used"],
                rows: budgetTableRows,
              },
            });
            visualSent = true;
          } else if (tableType === "category_breakdown") {
            send({
              type: "table",
              table: {
                title: args.title || "Spending by Category",
                columns: ["Category", "Amount"],
                rows: categoryTableRows,
              },
            });
            visualSent = true;
          } else if (tableType === "recent_transactions") {
            send({
              type: "table",
              table: {
                title: args.title || "Recent Transactions",
                columns: ["Date", "Category", "Description", "Amount"],
                rows: recentTxTableRows,
              },
            });
            visualSent = true;
          }
          continue;
        }

        // Models sometimes return numeric fields as strings; coerce them.
        for (const numericKey of [
          "amount",
          "balance",
          "monthly_limit",
          "target_amount",
          "current_amount",
          "principal_amount",
          "interest_rate",
        ]) {
          if (typeof args[numericKey] === "string") {
            const num = Number(args[numericKey]);
            if (!Number.isNaN(num)) args[numericKey] = num;
          }
        }

        // Recurring transactions are tagged "recurring" so they surface in the
        // dashboard's Recurring Bills tile and recurring-vs-one-time chart.
        if (call.name === "create_transaction" && args.recurring) {
          args.tags = ["recurring"];
        }
        delete args.recurring;

        // Resolve account_name -> account_id so the confirmation card can show/operate on the right account.
        if (
          (call.name === "create_transaction" || call.name === "update_account_balance") &&
          typeof args.account_name === "string"
        ) {
          const matched = (accounts || []).find(
            (a) => a.name.toLowerCase() === (args.account_name as string).toLowerCase()
          );
          if (matched) {
            args.account_id = matched.id;
            args.account_name = matched.name;
          }
        }

        // Resolve goal_name -> goal_id for contribute_to_goal.
        if (call.name === "contribute_to_goal") {
          const matched = (goals || []).find(
            (g) => g.name.toLowerCase() === String(args.goal_name || "").toLowerCase()
          );
          if (matched) {
            args.goal_id = matched.id;
            args.goal_name = matched.name;
          }
        }

        // Resolve person -> debt_id for record_debt_payment.
        if (call.name === "record_debt_payment") {
          const matched = (debts || []).find(
            (d) => d.person.toLowerCase() === String(args.person || "").toLowerCase()
          );
          if (matched) {
            args.debt_id = matched.id;
            args.person = matched.person;
          }
        }

        // Resolve from/to account names for transfer_funds.
        if (call.name === "transfer_funds") {
          const fromMatch = (accounts || []).find(
            (a) => a.name.toLowerCase() === String(args.from_account_name || "").toLowerCase()
          );
          const toMatch = (accounts || []).find(
            (a) => a.name.toLowerCase() === String(args.to_account_name || "").toLowerCase()
          );
          if (fromMatch) {
            args.from_account_id = fromMatch.id;
            args.from_account_name = fromMatch.name;
          }
          if (toMatch) {
            args.to_account_id = toMatch.id;
            args.to_account_name = toMatch.name;
          }
          if (!args.date) args.date = todayStr;
        }

        // A logged transaction must be tied to an account, otherwise it only moves the
        // income/expense totals and leaves account balances / net worth untouched.
        // When the model didn't name a (matching) account, fall back to the user's
        // first account; the confirmation card still shows which account is used.
        if (call.name === "create_transaction" && !args.account_id) {
          const fallback = (accounts || [])[0];
          if (fallback) {
            args.account_id = fallback.id;
            args.account_name = fallback.name;
          }
        }

        actions.push({ id: call.id || crypto.randomUUID(), type: call.name, args });
      }

      if (!replyText) {
        const fallback = actions.length > 0 ? "Here's what I'd like to do:" : visualSent ? "" : "Sorry, I couldn't generate a response.";
        if (fallback) send({ type: "content", text: fallback });
      }
      send({ type: "actions", actions });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
  });
}
