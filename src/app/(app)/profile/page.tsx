"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Wallet, Receipt, PiggyBank, Settings, Pencil, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAccounts } from "@/hooks/useAccounts";
import { useTransactions } from "@/hooks/useTransactions";
import { useBudgets } from "@/hooks/useBudgets";
import { useUserStore } from "@/stores/userStore";
import { formatNPR, formatDate } from "@/lib/utils";

export default function ProfilePage() {
  const { accounts, fetchAccounts } = useAccounts();
  const { transactions, fetchTransactions } = useTransactions();
  const { budgets, fetchBudgets } = useBudgets();
  const { displayName, setDisplayName } = useUserStore();

  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(displayName);

  useEffect(() => {
    fetchAccounts();
    fetchTransactions();
    fetchBudgets();
  }, []);

  const netWorth = useMemo(
    () => accounts.reduce((sum, a) => sum + (a.balance || 0), 0),
    [accounts]
  );

  const memberSince = useMemo(() => {
    const dates = accounts.map((a) => a.created_at).filter(Boolean) as string[];
    if (dates.length === 0) return null;
    return dates.reduce((earliest, d) => (d < earliest ? d : earliest), dates[0]);
  }, [accounts]);

  const saveName = () => {
    setDisplayName(nameInput);
    setEditing(false);
  };

  return (
    <div className="flex flex-col gap-6 w-full text-foreground pb-8 max-w-2xl">
      <Card className="p-6 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center font-bold text-primary-foreground text-2xl shrink-0">
          {displayName.trim().charAt(0).toUpperCase() || "U"}
        </div>
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex items-center gap-2">
              <Input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveName()}
                className="h-9 max-w-48"
                autoFocus
              />
              <Button size="icon" className="h-9 w-9" onClick={saveName} aria-label="Save name">
                <Check className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-foreground truncate">{displayName}</h2>
              <button
                onClick={() => {
                  setNameInput(displayName);
                  setEditing(true);
                }}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Edit display name"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          {memberSince && (
            <p className="text-xs text-muted-foreground mt-1">Member since {formatDate(memberSince)}</p>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 flex flex-col gap-2">
          <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center text-accent-foreground">
            <Wallet className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">Net Worth</p>
          <p className="font-serif text-2xl font-semibold tracking-tight tabular-nums">{formatNPR(netWorth)}</p>
        </Card>
        <Card className="p-5 flex flex-col gap-2">
          <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center text-accent-foreground">
            <Receipt className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">Transactions</p>
          <p className="font-serif text-2xl font-semibold tracking-tight tabular-nums">{transactions.length}</p>
        </Card>
        <Card className="p-5 flex flex-col gap-2">
          <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center text-accent-foreground">
            <PiggyBank className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">Active Budgets</p>
          <p className="font-serif text-2xl font-semibold tracking-tight tabular-nums">{budgets.length}</p>
        </Card>
      </div>

      <Card className="p-6 flex flex-col gap-3">
        <h3 className="text-sm font-bold text-foreground">Accounts</h3>
        <div className="flex flex-col gap-2">
          {accounts.length > 0 ? (
            accounts.map((acc) => (
              <div key={acc.id} className="flex items-center justify-between text-sm py-1">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: acc.color_tag || "var(--primary)" }}
                  />
                  <span className="text-foreground font-medium">{acc.name}</span>
                  <span className="text-muted-foreground text-xs capitalize">{acc.type}</span>
                </div>
                <span className="font-semibold text-foreground">{formatNPR(acc.balance)}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No accounts yet</p>
          )}
        </div>
      </Card>

      <Link href="/settings">
        <Button variant="outline" className="w-full">
          <Settings className="w-4 h-4" />
          App Settings
        </Button>
      </Link>
    </div>
  );
}
