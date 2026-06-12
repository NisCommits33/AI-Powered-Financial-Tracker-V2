import { createClient } from "@/lib/supabase/server";
import { formatNPR, withComputedSpent, currentMonthStart } from "@/lib/utils";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, ALL_CATEGORIES } from "@/lib/categories";

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
  const { messages } = await request.json();

  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "messages is required" }, { status: 400 });
  }

  const apiKey = process.env.GROK_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "AI assistant is not configured" }, { status: 500 });
  }

  const supabase = await createClient();

  const monthStart = currentMonthStart();

  const [{ data: accounts }, { data: transactions }, { data: monthTx }, { data: budgets }] =
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
    ]);

  const netWorth = (accounts || []).reduce((sum, a) => sum + (a.balance || 0), 0);

  const thisMonthTx = monthTx || [];
  const income = thisMonthTx.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const expenses = thisMonthTx.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

  const accountsSummary = (accounts || [])
    .map((a) => `- ${a.name} (${a.type}): ${formatNPR(a.balance)}`)
    .join("\n") || "No accounts yet.";

  const budgetsSummary = withComputedSpent(budgets || [], thisMonthTx)
    .map((b) => `- ${b.category}: ${formatNPR(b.spent)} of ${formatNPR(b.monthly_limit)} (${b.month})`)
    .join("\n") || "No budgets set.";

  const recentTxSummary = (transactions || [])
    .slice(0, 30)
    .map((t) => `- id:${t.id} | ${t.date.slice(0, 10)} | ${t.category} | ${t.description || ""} | ${formatNPR(t.amount)}`)
    .join("\n") || "No transactions yet.";

  const todayStr = new Date().toISOString().split("T")[0];

  const systemPrompt = `You are FinWise, a friendly and concise personal finance assistant embedded in the user's finance tracker app.
Today's date is ${todayStr}. Use the financial data below to answer questions accurately. Amounts are in Nepali Rupees (NPR).
Be concise, use plain language, and format currency using the NPR symbol already provided in the data. If the data doesn't contain enough information to answer, say so.

You can also take actions on the user's behalf (logging, editing, or deleting transactions, creating accounts, correcting account balances, setting budgets, and changing appearance settings like accent color, card style, button shape, theme mode, and dashboard charts) by calling the available tools.
When the user asks you to do something actionable, call the matching tool with your best-guess arguments based on their message. Do not ask for confirmation yourself - the app will show the user a confirmation card before anything is applied.
You may call multiple tools if the user describes multiple actions.
For edit_transaction and delete_transaction, find the matching transaction in the Recent Transactions list below and use its exact "id" value as transaction_id.
When logging a transaction with create_transaction, always set account_name to the account it should affect (pick the most relevant one from the Accounts list if the user doesn't say). Every transaction should move an account's balance.

## Net Worth
${formatNPR(netWorth)}

## This Month
Income: ${formatNPR(income)}
Expenses: ${formatNPR(expenses)}

## Accounts
${accountsSummary}

## Budgets
${budgetsSummary}

## Recent Transactions (most recent first)
${recentTxSummary}`;

  const groqMessages = [
    { role: "system", content: systemPrompt },
    ...messages.map((m: { role: string; content: string }) => ({ role: m.role, content: m.content })),
  ];

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: groqMessages,
      temperature: 0.4,
      tools,
      tool_choice: "auto",
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Groq API error:", response.status, errText);
    return Response.json({ error: "The AI assistant is having trouble responding right now." }, { status: 502 });
  }

  const data = await response.json();
  const message = data.choices?.[0]?.message;
  const reply = message?.content?.trim() || "";

  const toolCalls = message?.tool_calls || [];
  const actions = [];

  for (const call of toolCalls) {
    let args: Record<string, unknown> = {};
    try {
      args = JSON.parse(call.function.arguments);
    } catch {
      continue;
    }

    // Models sometimes return numeric fields as strings; coerce them.
    for (const numericKey of ["amount", "balance", "monthly_limit"]) {
      if (typeof args[numericKey] === "string") {
        const num = Number(args[numericKey]);
        if (!Number.isNaN(num)) args[numericKey] = num;
      }
    }

    // Resolve account_name -> account_id so the confirmation card can show/operate on the right account.
    if (
      (call.function.name === "create_transaction" || call.function.name === "update_account_balance") &&
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
    if (call.function.name === "create_transaction" && !args.account_id) {
      const fallback = (accounts || [])[0];
      if (fallback) {
        args.account_id = fallback.id;
        args.account_name = fallback.name;
      }
    }

    actions.push({ id: call.id, type: call.function.name, args });
  }

  return Response.json({
    reply: reply || (actions.length > 0 ? "Here's what I'd like to do:" : "Sorry, I couldn't generate a response."),
    actions,
  });
}
