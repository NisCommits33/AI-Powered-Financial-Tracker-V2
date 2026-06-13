"use client";

import { useState } from "react";
import { Account } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Edit2, Wallet, PiggyBank, Banknote, Smartphone } from "lucide-react";
import { motion } from "motion/react";
import { formatNPR } from "@/lib/utils";
import { AccountTransactionsModal } from "@/components/accounts/AccountTransactionsModal";

interface AccountListProps {
  accounts: Account[];
  loading: boolean;
  onEdit: (account: Account) => void;
  onDelete: (accountId: string) => void;
  onRefresh: () => void;
}

const typeIcons: Record<Account["type"], typeof Wallet> = {
  checking: Wallet,
  savings: PiggyBank,
  cash: Banknote,
  ewallet: Smartphone,
};

export function AccountList({
  accounts,
  loading,
  onEdit,
  onDelete,
  onRefresh,
}: AccountListProps) {
  const [viewingAccount, setViewingAccount] = useState<Account | undefined>();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading accounts...</div>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <div className="text-muted-foreground">No accounts yet</div>
        <Button onClick={onRefresh}>
          Refresh
        </Button>
      </div>
    );
  }

  return (
    <>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {accounts.map((account, index) => {
        const Icon = typeIcons[account.type] || Wallet;
        return (
          <motion.div
            key={account.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card
              className="p-5 hover:-translate-y-0.5 transition-all group relative cursor-pointer"
              onClick={() => setViewingAccount(account)}
              role="button"
              title={`View ${account.name} transactions`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="flex items-center justify-center w-11 h-11 rounded-xl shrink-0 text-white"
                    style={{ backgroundColor: account.color_tag || "var(--primary)" }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-foreground font-semibold truncate">
                      {account.name}
                    </h3>
                    <p className="text-muted-foreground text-xs capitalize">{account.type}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(account);
                    }}
                    aria-label="Edit account"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(account.id);
                    }}
                    aria-label="Delete account"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-border flex items-baseline justify-between">
                <p className="text-2xl font-bold text-foreground">
                  {formatNPR(account.balance)}
                </p>
                <p className="text-muted-foreground text-xs font-semibold">{account.currency}</p>
              </div>
            </Card>
          </motion.div>
        );
      })}
    </div>

    <AccountTransactionsModal
      account={viewingAccount}
      onClose={() => setViewingAccount(undefined)}
    />
    </>
  );
}
