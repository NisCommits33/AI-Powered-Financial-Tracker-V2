"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "motion/react";
import { AccountList } from "@/components/accounts/AccountList";
import { AccountForm } from "@/components/accounts/AccountForm";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Wallet } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAccounts } from "@/hooks/useAccounts";
import { formatNPR } from "@/lib/utils";
import { Account } from "@/types";

export default function AccountsPage() {
  const { accounts, loading, fetchAccounts, deleteAccount } = useAccounts();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | undefined>();

  useEffect(() => {
    fetchAccounts();
  }, []);

  const totalBalance = useMemo(() => {
    return accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
  }, [accounts]);

  const handleEdit = (account: Account) => {
    setSelectedAccount(account);
    setIsModalOpen(true);
  };

  const handleDelete = async (accountId: string) => {
    if (confirm("Are you sure you want to delete this account?")) {
      try {
        await deleteAccount(accountId);
      } catch (error) {
        console.error("Error deleting account:", error);
        alert("Failed to delete account");
      }
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsModalOpen(open);
    if (!open) {
      setSelectedAccount(undefined);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedAccount(undefined);
    fetchAccounts();
  };

  return (
    <div className="flex flex-col gap-6 w-full text-foreground pb-8">
      {/* Action bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end -mt-2"
      >
        <Dialog open={isModalOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button size="icon" aria-label="Add account">
              <Plus className="h-5 w-5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {selectedAccount ? "Edit Account" : "Add Account"}
              </DialogTitle>
            </DialogHeader>
            <AccountForm
              account={selectedAccount}
              onSuccess={handleCloseModal}
            />
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Total Balance Card */}
      {accounts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-8 bg-gradient-to-br from-primary/15 via-card to-card">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center text-primary">
                <Wallet className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">Total Balance</p>
            </div>
            <h2 className="text-4xl font-black tracking-tight text-foreground">
              {formatNPR(totalBalance)}
            </h2>
          </Card>
        </motion.div>
      )}

      <AccountList
        accounts={accounts}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onRefresh={fetchAccounts}
      />
    </div>
  );
}
