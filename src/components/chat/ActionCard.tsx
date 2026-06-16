"use client";

import { useRef, useState, forwardRef, useImperativeHandle } from "react";
import { Check, X, Loader2, Wallet, PiggyBank, Receipt, Palette, LayoutGrid, Pencil, Trash2, Square, SunMoon, ArrowLeftRight, Goal as GoalIcon, HandCoins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAccounts } from "@/hooks/useAccounts";
import { useBudgets } from "@/hooks/useBudgets";
import { useTransactions } from "@/hooks/useTransactions";
import { useGoals } from "@/hooks/useGoals";
import { useDebts } from "@/hooks/useDebts";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/categories";
import {
  useThemeStore,
  colorThemes,
  cardStyles,
  buttonRadii,
  type ColorTheme,
  type CardStyle,
  type ButtonRadius,
  type Mode,
} from "@/stores/themeStore";
import { useDashboardStore, chartDefs, type ChartId } from "@/stores/dashboardStore";
import { cn, formatNPR, withComputedSpent, currentMonthStart } from "@/lib/utils";
import { toast } from "sonner";

export type Status = "pending" | "done" | "cancelled" | "error";

// Compact status pill shown in the confirmation card header. Pending uses a
// pulsing dot; resolved states use a colored icon/dot matching their meaning.
const STATUS_META: Record<Status, { label: string; className: string; dot?: string; icon?: React.ReactNode }> = {
  pending: { label: "Pending", className: "bg-muted text-muted-foreground", dot: "bg-amber-500 animate-pulse" },
  done: { label: "Done", className: "bg-primary/10 text-primary", icon: <Check className="w-3 h-3" strokeWidth={2.5} /> },
  cancelled: { label: "Cancelled", className: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
  error: { label: "Failed", className: "bg-destructive/10 text-destructive", dot: "bg-destructive" },
};

export interface ChatAction {
  id: string;
  type:
    | "create_transaction"
    | "create_account"
    | "set_budget"
    | "set_accent_color"
    | "set_dashboard_charts"
    | "update_account_balance"
    | "edit_transaction"
    | "delete_transaction"
    | "set_card_style"
    | "set_button_radius"
    | "set_theme_mode"
    | "transfer_funds"
    | "create_goal"
    | "contribute_to_goal"
    | "create_debt"
    | "record_debt_payment";
  args: Record<string, any>;
  status?: Status;
}

export interface ActionCardHandle {
  confirm: () => void;
  cancel: () => void;
  status: Status;
}

function ActionShell({
  icon,
  title,
  children,
  status,
  busy,
  onConfirm,
  onCancel,
  editable = false,
  editing = false,
  onToggleEdit,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  status: Status;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  editable?: boolean;
  editing?: boolean;
  onToggleEdit?: () => void;
}) {
  const meta = STATUS_META[status];
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2.5 flex flex-col gap-1.5 max-w-[80%]">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
          {icon}
        </div>
        <p className="text-sm font-semibold text-foreground truncate">{title}</p>
        <span
          className={cn(
            "ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide shrink-0",
            meta.className
          )}
        >
          {meta.icon ?? <span className={cn("w-1.5 h-1.5 rounded-full", meta.dot)} />}
          {meta.label}
        </span>
      </div>
      <div className="text-xs text-muted-foreground pl-8 leading-relaxed [&_p]:mb-0">{children}</div>
      {status === "pending" && (
        <div className="flex items-center gap-2 pl-8 pt-0.5">
          <Button size="sm" onClick={onConfirm} disabled={busy} className="h-7 text-xs">
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Confirm
          </Button>
          <Button size="sm" variant="outline" onClick={onCancel} disabled={busy} className="h-7 text-xs">
            <X className="w-3.5 h-3.5" />
            Cancel
          </Button>
          {editable && (
            <button
              type="button"
              onClick={onToggleEdit}
              disabled={busy}
              className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              <Pencil className="w-3 h-3" strokeWidth={1.5} />
              {editing ? "Done" : "Edit"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Tiny labeled field used inside the editable confirmation cards.
function EditField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export const ActionCard = forwardRef<ActionCardHandle, { action: ChatAction; onStatusChange?: (status: Status) => void }>(
  ({ action, onStatusChange }, ref) => {
    const [status, setStatusState] = useState<Status>(action.status || "pending");
    const [busy, setBusy] = useState(false);
    // Editable copy of the proposed args (for "edit before confirm"). Confirm
    // handlers and the impact preview read from here, so edits flow through.
    const [args, setArgs] = useState<Record<string, any>>(action.args);
    const [editing, setEditing] = useState(false);
    const setArg = (key: string, value: unknown) => setArgs((prev) => ({ ...prev, [key]: value }));
    // Set to true by action types that support inline editing.
    let editable = false;

    const { createTransaction, updateTransactionEntry, softDeleteTransaction, transactions, fetchTransactions } = useTransactions();
    const { addAccount, updateAccountEntry, accounts, fetchAccounts } = useAccounts();
    const { createBudget, updateBudgetEntry, budgets } = useBudgets();
    const { createGoal, contributeToGoal, goals, fetchGoals } = useGoals();
    const { createDebt, recordPayment, debts, fetchDebts } = useDebts();
    const { setColorTheme, setCardStyle, setButtonRadius, setMode } = useThemeStore();
    const { setEnabledCharts } = useDashboardStore();

    const setStatus = (s: Status) => {
      setStatusState(s);
      onStatusChange?.(s);
    };

    const cancel = () => setStatus("cancelled");

    const run = async (fn: () => Promise<void> | void) => {
      setBusy(true);
      try {
        await fn();
        setStatus("done");
      } catch (e) {
        const message =
          e instanceof Error
            ? e.message
            : typeof e === "object" && e !== null && "message" in e
            ? String((e as { message: unknown }).message)
            : String(e);
        console.error("Action failed:", message);
        toast.error(message || "Something went wrong");
        setStatus("error");
      } finally {
        setBusy(false);
      }
    };

    let icon: React.ReactNode = null;
    let title = "";
    let content: React.ReactNode = null;
    let onConfirm: () => void = () => {};

    if (action.type === "create_transaction") {
      const { amount, description, category, date, account_id, account_name, tags } = args;
      const isExpense = amount < 0;
      editable = true;
      // The account this will hit (explicit choice, or fall back to first active).
      const resolvedAccount = accounts.find((a) => a.id === (account_id || accounts[0]?.id));
      // Budget impact: this category's spend so far this month vs. after this expense.
      const monthStart = currentMonthStart();
      const catBudget = isExpense
        ? withComputedSpent(budgets, transactions).find((b) => b.category === category && b.month === monthStart)
        : undefined;
      icon = <Receipt className="w-4 h-4" strokeWidth={1.5} />;
      title = "Log Transaction";
      onConfirm = () =>
        run(async () => {
          // A transaction must be tied to an account, otherwise the balance-sync
          // trigger has nothing to update and it silently vanishes from Total
          // Balance. The model may have resolved this already; if not (e.g. the
          // account was created moments earlier and wasn't in its account list
          // yet), fall back to the user's first active account from the live store.
          const resolvedAccountId = account_id || accounts[0]?.id;
          if (!resolvedAccountId) throw new Error("No account available to log this transaction against.");

          const { error } = await createTransaction({
            amount,
            description,
            category,
            date,
            account_id: resolvedAccountId,
            tags: tags || undefined,
          });
          if (error) throw error;
          await Promise.all([fetchTransactions(), fetchAccounts()]);
          toast.success("Transaction added!");
        });
      content = editing ? (
        <div className="grid grid-cols-2 gap-2 pt-1">
          <EditField label="Amount">
            <Input
              type="number"
              inputMode="decimal"
              value={Math.abs(amount)}
              onChange={(e) => {
                const v = Math.abs(Number(e.target.value) || 0);
                setArg("amount", isExpense ? -v : v);
              }}
              className="h-8 text-xs"
            />
          </EditField>
          <EditField label="Date">
            <Input type="date" value={date || ""} onChange={(e) => setArg("date", e.target.value)} className="h-8 text-xs" />
          </EditField>
          <EditField label="Category">
            <Select value={category} onValueChange={(v) => setArg("category", v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(isExpense ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map((c) => (
                  <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </EditField>
          <EditField label="Account">
            <Select
              value={resolvedAccount?.id || ""}
              onValueChange={(v) => {
                setArg("account_id", v);
                setArg("account_name", accounts.find((a) => a.id === v)?.name);
              }}
            >
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id} className="text-xs">{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </EditField>
          <div className="col-span-2">
            <EditField label="Description">
              <Input value={description || ""} onChange={(e) => setArg("description", e.target.value)} className="h-8 text-xs" />
            </EditField>
          </div>
        </div>
      ) : (
        <>
          <p>
            {isExpense ? "Expense" : "Income"} of <span className="font-semibold text-foreground">{formatNPR(Math.abs(amount))}</span>
            {description ? <> &middot; {description}</> : null} &middot; {category}
          </p>
          <p>
            {date}
            {resolvedAccount?.name ? <> &middot; {resolvedAccount.name}</> : account_name ? <> &middot; {account_name}</> : null}
            {tags?.includes("recurring") ? <> &middot; Recurring</> : null}
          </p>
          {resolvedAccount && (
            <p className="text-foreground/80">
              <span className="text-muted-foreground">{resolvedAccount.name}: </span>
              {formatNPR(resolvedAccount.balance)} <span className="text-muted-foreground">&rarr;</span>{" "}
              <span className="font-semibold">{formatNPR(resolvedAccount.balance + amount)}</span>
            </p>
          )}
          {catBudget && catBudget.monthly_limit > 0 && (() => {
            const after = catBudget.spent + Math.abs(amount);
            const beforePct = Math.round((catBudget.spent / catBudget.monthly_limit) * 100);
            const afterPct = Math.round((after / catBudget.monthly_limit) * 100);
            return (
              <p className={cn(afterPct > 100 ? "text-destructive" : "text-foreground/80")}>
                <span className="text-muted-foreground">{category} budget: </span>
                {beforePct}% <span className="text-muted-foreground">&rarr;</span>{" "}
                <span className="font-semibold">{afterPct}%</span>
                <span className="text-muted-foreground"> of {formatNPR(catBudget.monthly_limit)}</span>
              </p>
            );
          })()}
        </>
      );
    } else if (action.type === "create_account") {
      const { name, type, balance = 0, currency = "NPR", color_tag } = action.args;
      icon = <Wallet className="w-4 h-4" />;
      title = "Create Account";
      onConfirm = () =>
        run(async () => {
          await addAccount({ name, type, balance: balance || 0, currency: currency || "NPR", color_tag });
          toast.success("Account created!");
        });
      content = (
        <p>
          <span className="font-semibold text-foreground">{name}</span> &middot; {type} &middot; starting balance {formatNPR(balance || 0)} {currency || "NPR"}
        </p>
      );
    } else if (action.type === "set_budget") {
      const category = args.category;
      const monthly_limit = args.monthly_limit;
      const month = args.month || `${new Date().toISOString().slice(0, 7)}-01`;
      editable = true;
      icon = <PiggyBank className="w-4 h-4" strokeWidth={1.5} />;
      title = "Set Budget";
      // Current spend for this category/month, to preview against the new limit.
      const spent = withComputedSpent(budgets, transactions).find((b) => b.category === category && b.month === month)?.spent ?? 0;
      onConfirm = () =>
        run(async () => {
          const existing = budgets.find((b) => b.category === category && b.month === month);
          if (existing) {
            const { error } = await updateBudgetEntry(existing.id, { monthly_limit });
            if (error) throw error;
          } else {
            const { error } = await createBudget({ category, monthly_limit, spent: 0, month });
            if (error) throw error;
          }
          toast.success("Budget updated!");
        });
      content = editing ? (
        <div className="grid grid-cols-2 gap-2 pt-1">
          <EditField label="Category">
            <Select value={category} onValueChange={(v) => setArg("category", v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </EditField>
          <EditField label="Monthly limit">
            <Input
              type="number"
              inputMode="decimal"
              value={monthly_limit ?? ""}
              onChange={(e) => setArg("monthly_limit", Number(e.target.value) || 0)}
              className="h-8 text-xs"
            />
          </EditField>
        </div>
      ) : (
        <>
          <p>
            <span className="font-semibold text-foreground">{category}</span>: {formatNPR(monthly_limit)} / month ({month})
          </p>
          {monthly_limit > 0 && (() => {
            const pct = Math.round((spent / monthly_limit) * 100);
            return (
              <p className={cn(pct > 100 ? "text-destructive" : "text-foreground/80")}>
                <span className="text-muted-foreground">Spent so far: </span>
                {formatNPR(spent)} <span className="text-muted-foreground">({pct}% of new limit)</span>
              </p>
            );
          })()}
        </>
      );
    } else if (action.type === "set_accent_color") {
      const color = action.args.color as ColorTheme;
      const theme = colorThemes.find((c) => c.id === color);
      icon = <Palette className="w-4 h-4" />;
      title = "Change Accent Color";
      onConfirm = () =>
        run(() => {
          setColorTheme(color);
          toast.success("Accent color updated!");
        });
      content = (
        <div className="flex items-center gap-2">
          {theme && (
            <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: theme.swatch }} />
          )}
          <span className="font-semibold text-foreground">{theme?.label || color}</span>
        </div>
      );
    } else if (action.type === "set_dashboard_charts") {
      const charts: ChartId[] = action.args.charts || [];
      const labels = charts.map((id) => chartDefs.find((c) => c.id === id)?.label || id);
      icon = <LayoutGrid className="w-4 h-4" />;
      title = "Update Dashboard Charts";
      onConfirm = () =>
        run(() => {
          setEnabledCharts(charts);
          toast.success("Dashboard updated!");
        });
      content = <p>Show: {labels.length > 0 ? labels.join(", ") : "none"}</p>;
    } else if (action.type === "update_account_balance") {
      const { account_id, account_name, balance } = action.args;
      const account = accounts.find((a) => a.id === account_id);
      icon = <Wallet className="w-4 h-4" />;
      title = "Update Account Balance";
      onConfirm = () =>
        run(async () => {
          if (!account_id) throw new Error("Account not found");
          await updateAccountEntry(account_id, { balance });
          await fetchAccounts();
          toast.success("Balance updated!");
        });
      content = (
        <>
          <p>
            <span className="font-semibold text-foreground">{account?.name || account_name || "Account"}</span>
            {account ? <> &middot; {formatNPR(account.balance)} &rarr; </> : <> &middot; new balance: </>}
            <span className="font-semibold text-foreground">{formatNPR(balance)}</span>
          </p>
          {!account_id && <p className="text-destructive text-xs">Couldn&apos;t find that account.</p>}
        </>
      );
    } else if (action.type === "edit_transaction") {
      const { transaction_id, amount, description, category, date } = action.args;
      const original = transactions.find((t) => t.id === transaction_id);
      icon = <Pencil className="w-4 h-4" />;
      title = "Edit Transaction";
      onConfirm = () =>
        run(async () => {
          if (!transaction_id) throw new Error("Transaction not found");
          const updates: Record<string, unknown> = {};
          if (amount !== undefined) updates.amount = amount;
          if (description !== undefined) updates.description = description;
          if (category !== undefined) updates.category = category;
          if (date !== undefined) updates.date = date;
          const { error } = await updateTransactionEntry(transaction_id, updates);
          if (error) throw error;
          await Promise.all([fetchTransactions(), fetchAccounts()]);
          toast.success("Transaction updated!");
        });
      content = (
        <>
          {original ? (
            <p>
              {original.date.slice(0, 10)} &middot; {original.description || original.category} &middot; {formatNPR(original.amount)}
            </p>
          ) : null}
          <p className="text-foreground font-semibold">
            {[
              amount !== undefined ? `Amount: ${formatNPR(amount)}` : null,
              description !== undefined ? `Description: ${description}` : null,
              category !== undefined ? `Category: ${category}` : null,
              date !== undefined ? `Date: ${date}` : null,
            ]
              .filter(Boolean)
              .join(" · ") || "No changes"}
          </p>
          {!original && <p className="text-destructive text-xs">Couldn&apos;t find that transaction.</p>}
        </>
      );
    } else if (action.type === "delete_transaction") {
      const { transaction_id } = action.args;
      const original = transactions.find((t) => t.id === transaction_id);
      icon = <Trash2 className="w-4 h-4" />;
      title = "Delete Transaction";
      onConfirm = () =>
        run(async () => {
          if (!transaction_id) throw new Error("Transaction not found");
          const { error } = await softDeleteTransaction(transaction_id);
          if (error) throw error;
          await Promise.all([fetchTransactions(), fetchAccounts()]);
          toast.success("Transaction deleted!");
        });
      content = original ? (
        <p>
          {original.date.slice(0, 10)} &middot; {original.description || original.category} &middot; {formatNPR(original.amount)}
        </p>
      ) : (
        <p className="text-destructive text-xs">Couldn&apos;t find that transaction.</p>
      );
    } else if (action.type === "transfer_funds") {
      const { from_account_id, from_account_name, to_account_id, to_account_name, amount, date } = action.args;
      const fromAccount = accounts.find((a) => a.id === from_account_id);
      const toAccount = accounts.find((a) => a.id === to_account_id);
      icon = <ArrowLeftRight className="w-4 h-4" />;
      title = "Transfer Funds";
      onConfirm = () =>
        run(async () => {
          if (!from_account_id || !to_account_id) throw new Error("Couldn't find one of those accounts");
          const txDate = date || new Date().toISOString().slice(0, 10);
          const { error: outError } = await createTransaction({
            amount: -Math.abs(amount),
            description: `Transfer to ${to_account_name}`,
            category: "Other",
            date: txDate,
            account_id: from_account_id,
            tags: ["transfer"],
          });
          if (outError) throw outError;
          const { error: inError } = await createTransaction({
            amount: Math.abs(amount),
            description: `Transfer from ${from_account_name}`,
            category: "Other",
            date: txDate,
            account_id: to_account_id,
            tags: ["transfer"],
          });
          if (inError) throw inError;
          await Promise.all([fetchTransactions(), fetchAccounts()]);
          toast.success("Transfer complete!");
        });
      content = (
        <>
          <p>
            <span className="font-semibold text-foreground">{formatNPR(Math.abs(amount))}</span>
            {" "}from <span className="font-semibold text-foreground">{fromAccount?.name || from_account_name || "?"}</span>
            {" "}to <span className="font-semibold text-foreground">{toAccount?.name || to_account_name || "?"}</span>
          </p>
          {(!from_account_id || !to_account_id) && (
            <p className="text-destructive text-xs">Couldn&apos;t find one or both of those accounts.</p>
          )}
        </>
      );
    } else if (action.type === "create_goal") {
      const { name, target_amount, target_date, current_amount } = action.args;
      icon = <GoalIcon className="w-4 h-4" />;
      title = "Create Savings Goal";
      onConfirm = () =>
        run(async () => {
          const { error } = await createGoal({
            name,
            target_amount,
            target_date: target_date || null,
            current_amount: current_amount || 0,
          });
          if (error) throw error;
          toast.success("Goal created!");
        });
      content = (
        <p>
          <span className="font-semibold text-foreground">{name}</span>: target {formatNPR(target_amount)}
          {current_amount ? <> &middot; starting at {formatNPR(current_amount)}</> : null}
          {target_date ? <> &middot; by {target_date}</> : null}
        </p>
      );
    } else if (action.type === "contribute_to_goal") {
      const { goal_id, goal_name, amount } = action.args;
      const goal = goals.find((g) => g.id === goal_id);
      icon = <GoalIcon className="w-4 h-4" />;
      title = amount >= 0 ? "Add Funds to Goal" : "Withdraw Funds from Goal";
      onConfirm = () =>
        run(async () => {
          if (!goal_id) throw new Error("Couldn't find that goal");
          const { error } = await contributeToGoal(goal_id, amount);
          if (error) throw error;
          await fetchGoals();
          toast.success("Goal updated!");
        });
      content = (
        <>
          <p>
            <span className="font-semibold text-foreground">{goal?.name || goal_name}</span>
            {" "}{amount >= 0 ? "+" : ""}{formatNPR(amount)}
            {goal ? <> &middot; {formatNPR(goal.current_amount)} &rarr; {formatNPR(Math.max(0, goal.current_amount + amount))} of {formatNPR(goal.target_amount)}</> : null}
          </p>
          {!goal_id && <p className="text-destructive text-xs">Couldn&apos;t find that goal.</p>}
        </>
      );
    } else if (action.type === "create_debt") {
      const { person, direction, principal_amount, interest_rate, due_date, notes } = action.args;
      const isOwedByMe = direction === "owed_by_me";
      icon = <HandCoins className="w-4 h-4" />;
      title = isOwedByMe ? "Record Loan (You Owe)" : "Record Loan (Owed to You)";
      onConfirm = () =>
        run(async () => {
          const { error } = await createDebt({
            person,
            direction,
            principal_amount,
            interest_rate: interest_rate || null,
            due_date: due_date || null,
            notes: notes || null,
          });
          if (error) throw error;
          toast.success("Saved!");
        });
      content = (
        <p>
          <span className="font-semibold text-foreground">{person}</span>: {isOwedByMe ? "you owe" : "owed to you"} {formatNPR(principal_amount)}
          {interest_rate ? <> &middot; {interest_rate}% interest</> : null}
          {due_date ? <> &middot; due {due_date}</> : null}
        </p>
      );
    } else if (action.type === "record_debt_payment") {
      const { debt_id, person, amount } = action.args;
      const debt = debts.find((d) => d.id === debt_id);
      icon = <HandCoins className="w-4 h-4" />;
      title = "Record Debt Payment";
      onConfirm = () =>
        run(async () => {
          if (!debt_id) throw new Error("Couldn't find that debt record");
          const { error } = await recordPayment(debt_id, Math.abs(amount));
          if (error) throw error;
          await fetchDebts();
          toast.success("Payment recorded!");
        });
      content = (
        <>
          <p>
            <span className="font-semibold text-foreground">{debt?.person || person}</span>
            {" "}paid {formatNPR(Math.abs(amount))}
            {debt ? <> &middot; {formatNPR(debt.remaining_amount)} &rarr; {formatNPR(Math.max(0, debt.remaining_amount - Math.abs(amount)))} remaining</> : null}
          </p>
          {!debt_id && <p className="text-destructive text-xs">Couldn&apos;t find that debt record.</p>}
        </>
      );
    } else if (action.type === "set_card_style") {
      const style = action.args.style as CardStyle;
      const def = cardStyles.find((c) => c.id === style);
      icon = <Square className="w-4 h-4" />;
      title = "Change Card Style";
      onConfirm = () =>
        run(() => {
          setCardStyle(style);
          toast.success("Card style updated!");
        });
      content = (
        <>
          <p className="font-semibold text-foreground">{def?.label || style}</p>
          {def && <p className="text-xs">{def.description}</p>}
        </>
      );
    } else if (action.type === "set_button_radius") {
      const radius = action.args.radius as ButtonRadius;
      const def = buttonRadii.find((r) => r.id === radius);
      icon = <Square className="w-4 h-4 rounded-full" />;
      title = "Change Button Shape";
      onConfirm = () =>
        run(() => {
          setButtonRadius(radius);
          toast.success("Button shape updated!");
        });
      content = <p className="font-semibold text-foreground">{def?.label || radius}</p>;
    } else if (action.type === "set_theme_mode") {
      const mode = action.args.mode as Mode;
      icon = <SunMoon className="w-4 h-4" />;
      title = "Change Theme Mode";
      onConfirm = () =>
        run(() => {
          setMode(mode);
          toast.success("Theme mode updated!");
        });
      content = <p className="font-semibold text-foreground capitalize">{mode}</p>;
    }

    const handlersRef = useRef({ onConfirm, cancel });
    handlersRef.current = { onConfirm, cancel };

    useImperativeHandle(
      ref,
      () => ({
        confirm: () => handlersRef.current.onConfirm(),
        cancel: () => handlersRef.current.cancel(),
        status,
      }),
      [status]
    );

    if (!title) return null;

    return (
      <ActionShell
        icon={icon}
        title={title}
        status={status}
        busy={busy}
        onConfirm={onConfirm}
        onCancel={cancel}
        editable={editable}
        editing={editing}
        onToggleEdit={() => setEditing((v) => !v)}
      >
        {content}
      </ActionShell>
    );
  }
);

ActionCard.displayName = "ActionCard";
