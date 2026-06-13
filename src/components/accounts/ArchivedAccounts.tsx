"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, RotateCcw, Trash2, Archive } from "lucide-react";
import { useAccounts } from "@/hooks/useAccounts";
import { formatNPR } from "@/lib/utils";
import { Account } from "@/types";
import { toast } from "sonner";

export function ArchivedAccounts() {
  const { fetchArchivedAccounts, restoreAccount, permanentlyDeleteAccount, fetchAccounts } = useAccounts();
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [archived, setArchived] = useState<Account[]>([]);

  const handleToggle = async () => {
    if (!open && !loaded) {
      const data = await fetchArchivedAccounts();
      setArchived(data);
      setLoaded(true);
    }
    setOpen((o) => !o);
  };

  const handleRestore = async (account: Account) => {
    try {
      await restoreAccount(account.id);
      setArchived((prev) => prev.filter((a) => a.id !== account.id));
      await fetchAccounts();
      toast.success(`${account.name} restored`);
    } catch (error) {
      console.error("Error restoring account:", error);
      toast.error("Failed to restore account");
    }
  };

  const handlePermanentDelete = async (account: Account) => {
    if (!confirm(`Permanently delete "${account.name}"? This cannot be undone.`)) return;
    try {
      await permanentlyDeleteAccount(account.id);
      setArchived((prev) => prev.filter((a) => a.id !== account.id));
      toast.success(`${account.name} permanently deleted`);
    } catch (error) {
      console.error("Error deleting account:", error);
      toast.error("Failed to delete account");
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={handleToggle}
        className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors self-start"
      >
        <Archive className="h-4 w-4" />
        Archived Accounts
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            {archived.length === 0 ? (
              <p className="text-muted-foreground text-sm py-2">No archived accounts.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {archived.map((account) => (
                  <Card key={account.id} className="p-4 flex items-center justify-between gap-3 opacity-80">
                    <div className="min-w-0">
                      <h4 className="text-foreground font-semibold truncate">{account.name}</h4>
                      <p className="text-muted-foreground text-xs capitalize">
                        {account.type} &middot; {formatNPR(account.balance)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => handleRestore(account)}
                        aria-label="Restore account"
                        title="Restore"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handlePermanentDelete(account)}
                        aria-label="Permanently delete account"
                        title="Delete permanently"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
