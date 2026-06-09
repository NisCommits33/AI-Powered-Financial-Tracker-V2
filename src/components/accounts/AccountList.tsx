"use client";

import { Account } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Edit2 } from "lucide-react";
import { motion } from "motion/react";
import { formatNPR } from "@/lib/utils";

interface AccountListProps {
  accounts: Account[];
  loading: boolean;
  onEdit: (account: Account) => void;
  onDelete: (accountId: string) => void;
  onRefresh: () => void;
}

export function AccountList({
  accounts,
  loading,
  onEdit,
  onDelete,
  onRefresh,
}: AccountListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-white/60">Loading accounts...</div>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <div className="text-white/60">No accounts yet</div>
        <Button
          onClick={onRefresh}
          className="bg-primary hover:bg-primary-dark text-white"
        >
          Refresh
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {accounts.map((account, index) => (
        <motion.div
          key={account.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <Card className="glass-card border-glass-border p-4 hover:bg-white/5 transition-all">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1">
                {account.color_tag && (
                  <div
                    className="w-12 h-12 rounded-lg"
                    style={{ backgroundColor: account.color_tag }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold truncate">
                    {account.name}
                  </h3>
                  <p className="text-white/60 text-sm capitalize">{account.type}</p>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1">
                <p className="text-white font-semibold">
                  {formatNPR(account.balance)}
                </p>
                <p className="text-white/60 text-xs">{account.currency}</p>
              </div>
            </div>

            <div className="flex gap-2 mt-4 pt-4 border-t border-glass-border">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 border-white/20 hover:bg-white/10 text-white"
                onClick={() => onEdit(account)}
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 border-rose-500/20 hover:bg-rose-500/10 text-rose-400"
                onClick={() => onDelete(account.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
