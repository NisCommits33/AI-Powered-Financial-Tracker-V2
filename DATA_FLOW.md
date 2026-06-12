# Data Flow

How data moves between Supabase, Zustand stores, hooks, pages, and the AI chat layer.

---

## 1. Database (Supabase Postgres)

Tables: `accounts`, `transactions`, `budgets`, `ai_insights`. Single-user, no RLS — every read/write hits the same tables directly.

## 2. Two Supabase clients

| Client | File | Used by | Auth |
|---|---|---|---|
| Browser client | `src/lib/supabase/client.ts` (`createClientComponentClient`) | Hooks: `useAccounts`, `useBudgets`, `useTransactions` | publishable key |
| Server client | `src/lib/supabase/server.ts` (`createClient`) | API routes: `/api/chat`, `/api/chat/suggestions`, `/api/nl-parse` | cookies |

## 3. Core loop: Hooks → Zustand stores → Components

Each domain has a **Zustand store** (`accountStore`, `transactionStore`, `budgetStore`) holding the in-memory array + `loading` flag, and a **hook** wrapping it with Supabase calls:

```
Component → hook (e.g. useTransactions)
              ├─ fetchX()   → SELECT          → store.setX(data)
              ├─ createX()  → INSERT          → store.addX(data)
              ├─ updateX()  → UPDATE          → store.updateX(id, updates)
              └─ deleteX()  → soft UPDATE      → store.removeX(id)
```

Stores are global singletons (not React Context), so every component using the same hook shares one in-memory array without prop-drilling. Pages call `fetchX()` in a `useEffect` on mount.

### Account balance is maintained by the database, not the client
`accounts.balance` is kept in sync with linked transactions by a **Postgres trigger**
(`trg_sync_account_balance` → `sync_account_balance()`), which fires on every
`INSERT`/`UPDATE`/`DELETE` of a transaction row and adjusts the affected account(s):

- INSERT → `balance += amount`
- DELETE (or soft-delete via `deleted_at`) → `balance -= amount`
- UPDATE → reverses the old contribution and applies the new one (handles amount
  changes and moving a transaction between accounts)

Because the invariant lives in the database, the balance **cannot drift** regardless
of where a transaction comes from (app, AI agent, or raw SQL). The client never
computes balances. After a write, `useTransactions.refreshAccountBalances(...)` simply
re-reads the affected account rows so the in-memory store mirrors the DB's value.
Manual balance edits (AccountForm / the AI `update_account_balance` action) set the
balance absolutely and don't fire the trigger.

## 4. Page-level flows

- **Dashboard** (`(app)/dashboard/page.tsx`): `fetchAccounts` + `fetchBudgets` + `fetchTransactions` on mount → ~12 `useMemo` chart datasets (cashflow, category breakdown, net worth trend, daily spending, etc.), recomputed reactively from store data.
- **Transactions page**: `fetchTransactions` → `TransactionList` (client-side search/filter/paginate, Income/Expense/All toggle) + `TransactionForm` (Income/Expense tabs → `createTransaction`).
- **Budgets page**: `fetchBudgets` + `fetchTransactions` → `withComputedSpent()` (`src/lib/utils.ts`) recalculates `spent` per category from transactions at render time. The DB `spent` column is never trusted.
- **Accounts page**: `fetchAccounts` → `AccountList` / `AccountForm` → `addAccount` / `updateAccountEntry` / `deleteAccount`.
- **Settings page**: reads/writes `themeStore` and `dashboardStore` — both are `persist`-backed in `localStorage`, no DB involved. Controls accent color, card style, button radius, theme mode, and `enabledCharts`.

## 5. AI Chat (parallel path)

- **`/chat` page** posts message history to `/api/chat`.
- **`/api/chat/route.ts`** (server client) fetches accounts/transactions/budgets, builds a system prompt (net worth, budgets w/ computed spent, last 100 transactions incl. ids), sends it + tool definitions to Groq.
- Groq may return **tool calls** (`create_transaction`, `set_budget`, `set_theme_mode`, etc.). The route resolves account names → ids, coerces numeric strings, and returns `actions: [{id, type, args}]`. **Nothing is written yet.**
- **`ActionCard.tsx`** renders each action as a confirmation card. Only on "Confirm" does it call the same client-side hooks (`createTransaction`, `updateAccountEntry`, `setColorTheme`, ...) — AI actions and manual UI actions share one write path.
- **`/api/chat/suggestions`**: no LLM call — pulls accounts/budgets/transactions and runs rule-based logic to produce 3 dynamic suggestion chips.
- **`/api/nl-parse`**: "Quick Add" — sends free text + known account names to Groq, returns `{amount, description, category, date, account_id}`, which pre-fills `TransactionForm` for review before submit.

## Diagram

```
Supabase (Postgres)
   ▲  ▲                                    ▲
   │  │ (browser client)                   │ (server client)
   │  └── useAccounts/useBudgets/useTransactions ──► Zustand stores ──► Pages/Components
   │
   └── /api/chat, /api/chat/suggestions, /api/nl-parse (Groq-backed)
            │
            ▼
       returns text + proposed "actions"
            │
            ▼
       ActionCard → on confirm → same hooks above → Supabase + stores
```

**Architectural rule:** the DB is the source of truth, hooks are the only write path, stores are the reactive cache, and the AI never writes directly — it only proposes actions that funnel through the same hooks as manual edits.

---

## Issues Found in Current Data Flow — Status

All actionable issues below have been **resolved**. Each entry records the original problem and the fix that was applied.

### 1. ✅ `fetchBudgets` had no month filter
**Was:** `useBudgets.fetchBudgets` ran `SELECT * FROM budgets ORDER BY category` with no `month` filter, so every budget ever created (across all months) was loaded and rendered on the Budgets page and dashboard chart, mixing past and current months.
**Fix:** `fetchBudgets(month = currentMonthStart())` now filters `.eq("month", month)`, defaulting to the current month. A specific month can still be passed for a future "history" view. The Budgets page's duplicate `currentMonth()` helper and inline category list were replaced with the shared `currentMonthStart()` / `EXPENSE_CATEGORIES`. (`src/hooks/useBudgets.ts`, `src/app/(app)/budgets/page.tsx`)

### 2. ✅ Account balance could drift out of sync with transactions
**Was:** the balance was a client-maintained running total. It was updated with a
non-atomic `SELECT` + `UPDATE` (lost-update risk), and any transaction that didn't go
through `createTransaction` — including all transactions created before the sync logic
existed — never moved the balance. In practice this left the "Esewa" account showing a
balance of 0 while holding +9,500 of transactions, so net worth was understated.
**Fix (best, durable):** moved the invariant into the database. A trigger
(`sync_account_balance()` on the `transactions` table, migration
`account_balance_trigger`) maintains `accounts.balance` on every insert/update/delete
(including soft-deletes and account reassignment), making drift structurally
impossible. All client-side balance math (`adjustAccountBalance`, the
`increment_account_balance` RPC, the `getOriginal` fallback) was removed; the hook now
only re-reads affected accounts into the store after a write. The pre-existing drift was
reconciled once before the trigger went live. (`src/hooks/useTransactions.ts`)

### 3. ✅ Empty `transactionStore` silently skipped balance reversal (correctness bug)
**Was:** `updateTransactionEntry` / `softDeleteTransaction` looked up the original transaction only in the local Zustand store. On `/chat` (store not yet populated), the lookup returned `undefined`, so the balance reversal was skipped entirely.
**Fix:** subsumed by #2 — the database trigger reverses the old contribution itself using the row's previous values, so the client no longer needs the original transaction to keep the balance correct.

### 4. ✅ Timezone-sensitive date grouping
**Was:** dashboard charts and `/api/chat`'s "this month" filter used `new Date(t.date).getMonth()/getFullYear()`, parsing `YYYY-MM-DD` as UTC midnight and risking off-by-one-day bucketing in non-UTC zones (e.g. Nepal UTC+5:45).
**Fix:** added `parseLocalDate()` (builds a Date from `YYYY-MM-DD` components in local time) and switched all dashboard `new Date(t.date)` calls to it. `/api/chat` now derives "this month" from a date-string query filter instead of `new Date` math. (`src/lib/utils.ts`, `src/app/(app)/dashboard/page.tsx`, `src/app/api/chat/route.ts`)

### 5. ✅ `/api/chat` budget context capped at last 100 transactions
**Was:** `budgetsSummary` / monthly income+expense totals were computed from only the most recent 100 transactions, so a high-volume current month could be undercounted in the AI's view.
**Fix:** `/api/chat` now runs a dedicated `.gte("date", currentMonthStart())` query (no cap) for all month-based totals and budget `spent`, while the recent-100 list is still used only for the display/edit/delete id lookup. Budgets in chat context are also now filtered to the current month. (`src/app/api/chat/route.ts`)

### 6. ✅ Account/transaction store stale after AI actions on `/chat`
**Was:** confirming an AI transaction/balance action on `/chat` wrote correctly to the DB, but the UI on other pages stayed stale until a manual refetch (and `updateAccount` was a no-op against an empty store).
**Fix:** `ActionCard` now calls `fetchTransactions()` / `fetchAccounts()` after a successful create/edit/delete/balance action, so stores reflect the DB immediately. (`src/components/chat/ActionCard.tsx`)

### 7. ⏸️ No store reset / multi-session isolation — N/A
Zustand data stores have no explicit reset on "logout." The app is currently single-user with no auth/RLS, so there's nothing to reset and no data-flow bug today. **Deferred:** add a store-clear on sign-out if/when authentication is introduced.
