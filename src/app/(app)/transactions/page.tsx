"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTransactions } from "@/hooks/useTransactions";
import { useAccounts } from "@/hooks/useAccounts";
import { TransactionList } from "@/components/transactions/TransactionList";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

function TransactionsContent() {
  const { transactions, loading, fetchTransactions } = useTransactions();
  const { accounts, fetchAccounts } = useAccounts();
  const [showForm, setShowForm] = useState(false);
  const searchParams = useSearchParams();
  const accountFilter = searchParams.get("account") || undefined;

  useEffect(() => {
    fetchTransactions();
    fetchAccounts();
  }, []);

  return (
    <div className="flex flex-col gap-6 w-full text-foreground pb-8">
      <div className="flex justify-end -mt-2">
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          New
        </Button>
      </div>

      <TransactionList
        transactions={transactions}
        loading={loading}
        onRefresh={fetchTransactions}
        accounts={accounts}
        initialAccountFilter={accountFilter}
      />

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Transaction</DialogTitle>
          </DialogHeader>
          <TransactionForm
            onSuccess={() => {
              setShowForm(false);
              fetchTransactions();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense>
      <TransactionsContent />
    </Suspense>
  );
}
