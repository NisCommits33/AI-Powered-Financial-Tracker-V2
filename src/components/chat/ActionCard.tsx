"use client";

import { useRef, useState, forwardRef, useImperativeHandle } from "react";
import { Check, X, Loader2, Wallet, PiggyBank, Receipt, Palette, LayoutGrid, Pencil, Trash2, Square, SunMoon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAccounts } from "@/hooks/useAccounts";
import { useBudgets } from "@/hooks/useBudgets";
import { useTransactions } from "@/hooks/useTransactions";
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
import { formatNPR } from "@/lib/utils";
import { toast } from "sonner";

export type Status = "pending" | "done" | "cancelled" | "error";

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
    | "set_theme_mode";
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
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  status: Status;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 flex flex-col gap-2 max-w-[80%]">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
          {icon}
        </div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
      </div>
      <div className="text-sm text-muted-foreground pl-9">{children}</div>
      {status === "pending" && (
        <div className="flex gap-2 pl-9 pt-1">
          <Button size="sm" onClick={onConfirm} disabled={busy} className="h-8">
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Confirm
          </Button>
          <Button size="sm" variant="outline" onClick={onCancel} disabled={busy} className="h-8">
            <X className="w-3.5 h-3.5" />
            Cancel
          </Button>
        </div>
      )}
      {status === "done" && <p className="text-xs font-semibold text-primary pl-9">Done</p>}
      {status === "cancelled" && <p className="text-xs font-semibold text-muted-foreground pl-9">Cancelled</p>}
      {status === "error" && <p className="text-xs font-semibold text-destructive pl-9">Something went wrong</p>}
    </div>
  );
}

export const ActionCard = forwardRef<ActionCardHandle, { action: ChatAction; onStatusChange?: (status: Status) => void }>(
  ({ action, onStatusChange }, ref) => {
    const [status, setStatusState] = useState<Status>(action.status || "pending");
    const [busy, setBusy] = useState(false);

    const { createTransaction, updateTransactionEntry, softDeleteTransaction, transactions, fetchTransactions } = useTransactions();
    const { addAccount, updateAccountEntry, accounts, fetchAccounts } = useAccounts();
    const { createBudget, updateBudgetEntry, budgets } = useBudgets();
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
      const { amount, description, category, date, account_id, account_name, tags } = action.args;
      icon = <Receipt className="w-4 h-4" />;
      title = "Log Transaction";
      onConfirm = () =>
        run(async () => {
          const { error } = await createTransaction({
            amount,
            description,
            category,
            date,
            account_id: account_id || undefined,
            tags: tags || undefined,
          });
          if (error) throw error;
          await Promise.all([fetchTransactions(), fetchAccounts()]);
          toast.success("Transaction added!");
        });
      content = (
        <>
          <p>
            {amount > 0 ? "Income" : "Expense"} of <span className="font-semibold text-foreground">{formatNPR(Math.abs(amount))}</span>
            {description ? <> &middot; {description}</> : null} &middot; {category}
          </p>
          <p>
            {date}
            {account_name ? <> &middot; {account_name}</> : null}
            {tags?.includes("recurring") ? <> &middot; Recurring</> : null}
          </p>
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
      const category = action.args.category;
      const monthly_limit = action.args.monthly_limit;
      const month = action.args.month || `${new Date().toISOString().slice(0, 7)}-01`;
      icon = <PiggyBank className="w-4 h-4" />;
      title = "Set Budget";
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
      content = (
        <p>
          <span className="font-semibold text-foreground">{category}</span>: {formatNPR(monthly_limit)} / month ({month})
        </p>
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
      <ActionShell icon={icon} title={title} status={status} busy={busy} onConfirm={onConfirm} onCancel={cancel}>
        {content}
      </ActionShell>
    );
  }
);

ActionCard.displayName = "ActionCard";
