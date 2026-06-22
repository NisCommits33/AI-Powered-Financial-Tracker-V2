"use client";

import { useState } from "react";
import { Account } from "@/types";
import { Button } from "@/components/ui/button";
import { Trash2, Edit2, Wallet, PiggyBank, Banknote, Smartphone } from "lucide-react";
import { motion } from "motion/react";
import { formatNPR } from "@/lib/utils";
import { AccountTransactionsModal } from "@/components/accounts/AccountTransactionsModal";
import { CardPattern } from "@/components/ui/CardPattern";
import { CardNoise } from "@/components/ui/CardNoise";

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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {accounts.map((account, index) => {
        const Icon = typeIcons[account.type] || Wallet;
        const color = account.color_tag || "var(--primary)";
        const last4 = account.id.replace(/-/g, "").slice(-4).padStart(4, "0");
        return (
          <motion.div
            key={account.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ y: -4, rotateX: 4, rotateY: -4, scale: 1.015 }}
            style={{ perspective: 800 }}
          >
            <div
              className="relative overflow-hidden rounded-[22px] p-6 flex flex-col justify-between gap-7 min-h-[180px] cursor-pointer text-white transition-shadow duration-300 group"
              style={{
                background: `linear-gradient(135deg, color-mix(in srgb, ${color} 92%, white) 0%, ${color} 45%, color-mix(in srgb, ${color} 60%, black) 100%)`,
                boxShadow: `0 12px 30px -12px color-mix(in srgb, ${color} 55%, transparent), 0 2px 6px -2px color-mix(in srgb, ${color} 40%, transparent)`,
              }}
              onClick={() => setViewingAccount(account)}
              role="button"
              title={`View ${account.name} transactions`}
            >
              {/* Texture + decorative pattern */}
              <CardNoise className="absolute inset-0 w-full h-full opacity-[0.06] pointer-events-none mix-blend-overlay" />
              <CardPattern variant="topo" className="absolute top-0 right-0 w-40 h-28 text-white/30 pointer-events-none" />

              {/* Diagonal sheen */}
              <div
                className="absolute -inset-1/2 pointer-events-none opacity-40 group-hover:opacity-60 transition-opacity duration-500"
                style={{
                  background: "linear-gradient(115deg, transparent 35%, rgba(255,255,255,0.35) 50%, transparent 65%)",
                }}
              />

              {/* Bottom glow */}
              <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-white/10 blur-2xl pointer-events-none" />

              {/* Top row: chip + actions */}
              <div className="relative z-10 flex items-start justify-between gap-3">
                <div className="w-10 h-7 rounded-md bg-gradient-to-br from-white/40 to-white/10 border border-white/30 shadow-inner flex items-center justify-center">
                  <Icon className="h-4 w-4" strokeWidth={1.5} />
                </div>

                <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/15"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(account);
                    }}
                    aria-label="Edit account"
                    title="Edit account"
                  >
                    <Edit2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/15"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(account.id);
                    }}
                    aria-label="Delete account"
                    title="Delete account"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </Button>
                </div>
              </div>

              {/* Masked card number */}
              <p className="relative z-10 font-mono text-sm tracking-[0.25em] text-white/60">
                •••• •••• •••• {last4}
              </p>

              {/* Bottom: balance + name */}
              <div className="relative z-10">
                <p className="text-[26px] font-bold tracking-tight tabular-nums mb-1.5">
                  {formatNPR(account.balance)}
                </p>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm truncate">{account.name}</h3>
                    <p className="text-white/65 text-[11px] uppercase tracking-wider">{account.type}</p>
                  </div>
                  <p className="text-white/65 text-xs font-semibold shrink-0">{account.currency}</p>
                </div>
              </div>
            </div>
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
