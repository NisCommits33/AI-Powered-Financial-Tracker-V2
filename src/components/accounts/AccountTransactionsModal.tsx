"use client";

import { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TransactionList } from "@/components/transactions/TransactionList";
import { useTransactions } from "@/hooks/useTransactions";
import { Account } from "@/types";

interface AccountTransactionsModalProps {
  account?: Account;
  onClose: () => void;
}

export function AccountTransactionsModal({ account, onClose }: AccountTransactionsModalProps) {
  const { transactions, loading, fetchTransactions } = useTransactions();

  useEffect(() => {
    if (account) fetchTransactions();
  }, [account]);

  return (
    <Dialog open={!!account} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{account?.name} Transactions</DialogTitle>
        </DialogHeader>
        {account && (
          <TransactionList
            transactions={transactions}
            loading={loading}
            onRefresh={fetchTransactions}
            initialAccountFilter={account.id}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
