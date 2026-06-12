# Bug Tracker

A running log of bugs found in FinWise, their root cause, and fix status.

---

## ✅ Solved

### 1. Wrong AI provider (Grok vs Groq)
- **Symptom:** `/api/chat` returned 401/errors; AI assistant didn't respond.
- **Cause:** Implemented against `https://api.x.ai/v1/chat/completions` (xAI "Grok") with model `grok-4-fast`, based on env var name `GROK_API_KEY` and spec wording. The user actually provided a **Groq** API key (`gsk_...`).
- **Fix:** Switched endpoint to `https://api.groq.com/openai/v1/chat/completions`, model `llama-3.3-70b-versatile`, in both `/api/chat/route.ts` and `/api/nl-parse/route.ts`.
- **Files:** `src/app/api/chat/route.ts`, `src/app/api/nl-parse/route.ts`

### 2. Recharts `Tooltip` formatter type errors
- **Symptom:** `npx tsc --noEmit` failed with `(value: number) => string` not assignable to Recharts `Formatter<ValueType, NameType>` across 9 chart sections.
- **Cause:** Recharts' `Tooltip` formatter receives `ValueType` (`number | string | Array<number|string>`), not a plain `number`.
- **Fix:** Changed all `formatter={(value: number) => formatNPR(value)}` → `formatter={(value) => formatNPR(Number(value))}` (and the budget-usage one to `${Math.round(Number(value))}%`).
- **Files:** `src/app/(app)/dashboard/page.tsx`

### 3. Zod validation blocked negative (expense) amounts from NL parser
- **Symptom:** Natural-language Quick Add failed validation for expenses (negative amounts).
- **Cause:** `transactionSchema.amount` required `.positive()`, but the app's sign convention is negative = expense, positive = income.
- **Fix:** Changed to `.refine((v) => v !== 0, "Amount cannot be zero")`.
- **Files:** `src/lib/validations.ts`

### 4. Groq tool-call validation 400 error on `create_account`
- **Symptom:** `400 ... tool call validation failed: parameters for tool create_account did not match schema: errors: [\`/balance\`: expected number, but got string]`
- **Cause:** Groq sometimes returns numeric tool-call arguments as strings, but the JSON schema declared `balance`/`amount`/`monthly_limit` as `"number"` only.
- **Fix:** Widened schema types to `["number", "string"]` for `amount`, `balance`, `monthly_limit`, and added a coercion loop that converts numeric strings to numbers before building the proposed actions.
- **Files:** `src/app/api/chat/route.ts`

### 5. `ActionCard` `busy` prop "Cannot find name" error
- **Symptom:** TS error `Cannot find name 'busy'` in 3 places inside `ActionShell` usages.
- **Cause:** `ActionShell`'s prop type declared `busy: boolean`, but the destructured function parameters list omitted `busy`.
- **Fix:** Added `busy` to the destructured parameter list.
- **Files:** `src/components/chat/ActionCard.tsx`

### 6. Rules-of-hooks violation in `set_budget` action handler (caught pre-runtime)
- **Symptom:** Would have thrown a "hooks called conditionally" error.
- **Cause:** `useBudgets()` was called a second time inside the `run()` callback to grab `updateBudgetEntry`.
- **Fix:** Destructured `updateBudgetEntry` once at the top level of `ActionCard`, alongside `createBudget` and `budgets`.
- **Files:** `src/components/chat/ActionCard.tsx`

### 7. Confusing `{}` console error from failed agentic actions
- **Symptom:** Console showed `Console Error: {}` with no useful information when a confirmation-card action failed.
- **Cause:** `catch (e) { console.error(e); }` logged a raw Supabase/JS error object, which Next's overlay rendered as `{}`.
- **Fix:** `run()` now extracts `e.message` (or stringifies) before logging, and surfaces it via `toast.error(message)`.
- **Files:** `src/components/chat/ActionCard.tsx`

### 8. Chat suggestion chips were static/generic
- **Symptom:** The 3 suggestion chips on `/chat` never changed and weren't based on the user's actual data.
- **Cause:** Hardcoded array of generic questions.
- **Fix:** Added `/api/chat/suggestions` (rule-based, no LLM call for speed) that inspects accounts, budgets, and this month's transactions to surface relevant prompts (over-budget categories, near-limit categories, low balances, top spending category, biggest expense, no-budget/no-transaction onboarding).
- **Files:** `src/app/api/chat/suggestions/route.ts`, `src/app/(app)/chat/page.tsx`

### 9. `budget.spent` was permanently stuck at 0
- **Symptom:** Budget usage chart, budgets page totals, and "over budget"/"near limit" chat suggestions never reflected real spending — every budget showed 0% used.
- **Cause:** `budget.spent` was hardcoded to `0` on creation (`src/app/(app)/budgets/page.tsx`) and never updated anywhere when transactions were created/edited/deleted.
- **Fix:** Added `withComputedSpent(budgets, transactions)` in `src/lib/utils.ts`, which recalculates `spent` per category from actual expense transactions in the budget's month. Wired into the budgets page, dashboard budget-usage chart, and chat context/suggestions. The stored `spent` column is no longer read.
- **Files:** `src/lib/utils.ts`, `src/app/(app)/budgets/page.tsx`, `src/app/(app)/dashboard/page.tsx`, `src/app/api/chat/route.ts`, `src/app/api/chat/suggestions/route.ts`

### 10. Account balance never changed when transactions were added/edited/deleted
- **Symptom:** Creating a -20 expense transaction correctly showed up in "This Month Expenses", but the account's balance and the dashboard "Total Balance" (net worth) didn't decrease — accounts and transactions were completely independent.
- **Cause:** `createTransaction` / `updateTransactionEntry` / `softDeleteTransaction` in `useTransactions.ts` only wrote to the `transactions` table and never touched `accounts.balance`.
- **Fix:** Added `adjustAccountBalance(accountId, delta)` to `useTransactions.ts`:
  - On create: `balance += amount` (negative amount for expenses correctly decreases balance, positive income increases it).
  - On edit: reverses the old amount and applies the new one (handles category/amount/account changes).
  - On soft-delete: reverses the transaction's amount.
  - Updates both the DB (`accounts` table) and the local `accountStore` so the dashboard reflects the change immediately.
- **Files:** `src/hooks/useTransactions.ts`, `src/stores/accountStore.ts`

---

## 🟡 Remaining / Known Issues

### A. Timezone risk in date-based groupings
- **Where:** Cashflow (6-month), daily spending, year-over-year, weekly heatmap charts in `src/app/(app)/dashboard/page.tsx`, and "this month" filters in `/api/chat/route.ts`.
- **Issue:** `new Date(t.date)` parses `YYYY-MM-DD` strings in local time. For users far from UTC, this can shift a transaction into the adjacent day/month near midnight.
- **Suggested fix:** Compare date strings directly (e.g., `t.date.slice(0, 7) === currentMonth`) instead of constructing `Date` objects, as already done in `withComputedSpent`.
- **Status:** Not yet fixed — low impact, but worth addressing for users in non-UTC timezones (e.g., Nepal, UTC+5:45).

### B. No reconciliation/audit between account balances and transaction history
- **Issue:** Account balances are now updated incrementally on each transaction (see fix #10), but there's no way to detect drift if a write partially fails (e.g., transaction insert succeeds but balance update fails due to a network error) or if a user manually edits a balance via `update_account_balance`.
- **Suggested fix:** Add a "Recalculate balance from transactions" action per account, or a dashboard warning when `sum(transactions for account) + opening balance !== current balance`.
- **Status:** Not started.

### C. Conversation history not persisted
- **Issue:** `/chat` resets to the welcome message on every page reload; no chat history is stored in Supabase.
- **Status:** Tracked as a near-term priority in `CHAT_FEATURE_IDEAS.md`.

### D. No streaming responses from Groq
- **Issue:** Chat replies wait for the full LLM response before rendering, which feels slow for longer answers.
- **Status:** Tracked in `CHAT_FEATURE_IDEAS.md`.
