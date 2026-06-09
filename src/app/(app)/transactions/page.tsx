"use client";

import { useEffect, useState } from "react";
import { useTransactions } from "@/hooks/useTransactions";
import { TransactionList } from "@/components/transactions/TransactionList";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function TransactionsPage() {
  const { transactions, loading, fetchTransactions } = useTransactions();
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchTransactions();
  }, []);

  return (
    <div className="flex flex-col gap-6 w-full text-zinc-950 dark:text-zinc-50 pb-8">
      {/* Header */}
      <header className="flex justify-between items-center py-2">
        <div>
          <p className="text-xs font-bold text-zinc-400 dark:text-zinc-500 tracking-wider uppercase">Finance</p>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">All Transactions</h1>
        </div>
        <Button 
          onClick={() => setShowForm(true)}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          New
        </Button>
      </header>

      {/* Transaction List */}
      <TransactionList 
        transactions={transactions}
        loading={loading}
        onRefresh={fetchTransactions}
      />

      {/* Transaction Form Dialog */}
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
