"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "motion/react";
import { AccountList } from "@/components/accounts/AccountList";
import { AccountForm } from "@/components/accounts/AccountForm";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus } from "lucide-react";
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

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedAccount(undefined);
    fetchAccounts();
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="container max-w-md mx-auto p-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center mb-6 pt-4"
        >
          <h1 className="text-3xl font-bold text-white">Accounts</h1>
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button
                size="icon"
                className="rounded-full bg-primary hover:bg-primary-dark"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card border-glass-border max-w-md">
              <DialogHeader>
                <DialogTitle className="text-white">
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
            className="mb-6"
          >
            <Card className="glass-card border-glass-border p-6 bg-gradient-to-br from-primary/20 to-primary/5">
              <p className="text-white/60 text-sm mb-2">Total Balance</p>
              <h2 className="text-4xl font-bold text-white">
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
      <BottomNav />
    </div>
  );
}