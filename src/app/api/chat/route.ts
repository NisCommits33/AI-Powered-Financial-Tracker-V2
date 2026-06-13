import { createClient } from "@/lib/supabase/server";
import { formatNPR, withComputedSpent, currentMonthStart } from "@/lib/utils";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, ALL_CATEGORIES } from "@/lib/categories";
import { AVAILABLE_MODELS, DEFAULT_MODEL } from "@/lib/groqModels";

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
  const { messages, model } = await request.json();

  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "messages is required" }, { status: 400 });
  }

  const selectedModel = AVAILABLE_MODELS.some((m) => m.id === model) ? model : DEFAULT_MODEL;

  const apiKeys = [process.env.GROK_API_KEY, process.env.GROK_API_KEY_2].filter((k): k is string => !!k);
  if (apiKeys.length === 0) {
    return Response.json({ error: "AI assistant is not configured" }, { status: 500 });
  }

  const supabase = await createClient();

  const monthStart = currentMonthStart();

  // Start of the 6-month window (inclusive of the current month) for trend analysis.
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  const sixMonthsAgoStr = sixMonthsAgo.toISOString().slice(0, 10);

  const [{ data: accounts }, { data: transactions }, { data: monthTx }, { data: budgets }, { data: trendTx }] =
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

  const recentTxSummary = (transactions || [])
    .slice(0, 30)
    .map(
      (t) =>
        `- id:${t.id} | ${t.date.slice(0, 10)} | ${t.category} | ${t.description || ""} | ${formatNPR(t.amount)}${t.is_anomaly ? " | [flagged as anomaly]" : ""}`
    )
    .join("\n") || "No transactions yet.";

  const todayStr = new Date().toISOString().split("T")[0];

  const systemPrompt = `You are FinWise, a friendly, concise, and reliable personal finance assistant embedded inside the user's finance tracker application.

Today's date is ${todayStr}.

The financial data below is the ONLY source of truth. All amounts are in Nepali Rupees (NPR).

GENERAL RULES
- Answer using only the provided financial data and the current conversation.
- Be concise and use simple, natural language.
- Format currency using the same NPR format already present in the data.
- Never invent transactions, balances, budgets, categories, accounts, or statistics.
- If the provided data is insufficient, explicitly say you do not have enough information instead of guessing.
- Perform calculations only from the supplied data.

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
Call a tool ONLY when the user is explicitly requesting an action to be performed NOW.

Examples that SHOULD call tools:
- "Add a Rs.500 lunch expense."
- "Log salary income of Rs.50000."
- "Delete my latest grocery transaction."
- "Change to dark mode."
- "Set my food budget to Rs.12000."
- "Create a cash account with Rs.3000."
- "Add my rent of Rs.15000 every month on the 1st." (call create_transaction with recurring: true)
- "Show me a chart of my spending by category." (call show_chart)

Examples that should NOT call tools:
- "How can I save money?"
- "Why are my expenses high?"
- "Should I set a budget?"
- "Can you recommend a budget?"
- "What category do I spend the most on?"
- "Analyze my finances."
- "Am I spending more than last month?"
- "If I cut my dining out by 30%, how much would I save per year?"

For informational questions, provide a text response only. Trend, comparison, and "what-if" questions
should be answered using the Monthly Income vs Expenses history and Recent Transactions provided below —
do them yourself with simple arithmetic, do not call a tool for these unless the user also asks for a chart.

Additional informational question types and how to answer them from the supplied data:
- Category deep-dives ("Why did my Food spending spike in May?") — use the Category Spending by Month
  breakdown below to compare the category's totals across months and identify the spike.
- Anomaly explanations ("What's that NPR 5,000 charge on June 3rd?") — look in Recent Transactions for a
  matching date/amount; transactions marked "[flagged as anomaly]" were detected as unusual. Explain using
  the transaction's category, description, and amount.
- Forecast / projection ("At this rate, will I hit my savings goal by December?") — use Average Monthly
  Income/Expenses/Savings below to extrapolate. If the user hasn't stated a savings goal amount or target
  date, ask for it before projecting.
- Subscription/recurring charge audit ("List all my recurring payments and their total") — use the
  Recurring Transactions list and total below.
- Cash flow runway ("How many months can I survive on my current balance if income stops?") — use the
  Estimated Cash Flow Runway figure below, or recompute it as Net Worth / Average Monthly Expenses.

If the user's intent is ambiguous, assume they want information only and DO NOT call any tools.

When a user clearly requests an action:
- Call the appropriate tool immediately.
- Do NOT ask for confirmation.
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

### Recent Transactions (Most Recent First)
${recentTxSummary}

### Monthly Income vs Expenses (Last 6 Months)
${monthlyTrendSummary}

### Category Spending by Month (Last 6 Months)
${categoryByMonthSummary}

### Recurring Transactions
${recurringSummary}

### Forecast Data
Average Monthly Income: ${formatNPR(avgMonthlyIncome)}
Average Monthly Expenses: ${formatNPR(avgMonthlyExpenses)}
Average Monthly Net Savings: ${formatNPR(avgMonthlySavings)}
Estimated Cash Flow Runway: ${cashFlowRunwayMonths} months (Net Worth / Average Monthly Expenses)`;

  const groqMessages = [
    { role: "system", content: systemPrompt },
    ...messages.map((m: { role: string; content: string }) => ({ role: m.role, content: m.content })),
  ];

  const groqRequestBody = JSON.stringify({
    model: selectedModel,
    messages: groqMessages,
    temperature: 0.4,
    tools,
    tool_choice: "auto",
    stream: true,
  });

  // Try each configured key in turn — if one is rate-limited (429), fall back to the next.
  let response: Response | null = null;
  for (let i = 0; i < apiKeys.length; i++) {
    const attempt = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKeys[i]}`,
      },
      body: groqRequestBody,
    });
    if (attempt.ok || attempt.status !== 429 || i === apiKeys.length - 1) {
      response = attempt;
      break;
    }
  }

  if (!response || !response.ok || !response.body) {
    const errText = await response?.text();
    console.error("Groq API error:", response?.status, errText);
    const message =
      response?.status === 429
        ? "The AI assistant has hit its daily usage limit. Please try again later."
        : "The AI assistant is having trouble responding right now.";
    return Response.json({ error: message }, { status: 502 });
  }

  const encoder = new TextEncoder();
  const groqBody = response.body;

  // Groq returns its current rate-limit/quota state on every response via
  // these headers; surface them so the UI can show remaining usage.
  const usage = {
    model: selectedModel,
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
      let chartSent = false;
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
            chartSent = true;
          } else if (chartType === "spending_trend") {
            send({
              type: "chart",
              chart: { chart_type: chartType, title: args.title || "Income vs Expenses (Last 6 Months)", data: monthlyTrend },
            });
            chartSent = true;
          }
          continue;
        }

        // Models sometimes return numeric fields as strings; coerce them.
        for (const numericKey of ["amount", "balance", "monthly_limit"]) {
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
        const fallback = actions.length > 0 ? "Here's what I'd like to do:" : chartSent ? "" : "Sorry, I couldn't generate a response.";
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
