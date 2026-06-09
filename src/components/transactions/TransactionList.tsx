"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Transaction } from "@/types";
import { formatNPR, formatDate } from "@/lib/utils";
import { Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTransactions } from "@/hooks/useTransactions";
import { toast } from "sonner";

interface TransactionListProps {
  transactions: Transaction[];
  loading?: boolean;
  onRefresh: () => void;
}

const categories = [
  "All",
  "Food",
  "Transport",
  "Shopping",
  "Health",
  "Entertainment",
  "Utilities",
  "Education",
  "Rent",
  "Savings",
  "Other",
];

export function TransactionList({ transactions, loading, onRefresh }: TransactionListProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const { softDeleteTransaction } = useTransactions();

  const filtered = transactions.filter((t) => {
    const matchesSearch = t.description?.toLowerCase().includes(search.toLowerCase()) || false;
    const matchesCategory = categoryFilter === "All" || t.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleDelete = async (id: string) => {
    await softDeleteTransaction(id);
    toast.success("Transaction deleted", {
      action: {
        label: "Undo",
        onClick: () => {
          // Restore logic would go here, but for simplicity we just refresh
          onRefresh();
        },
      },
    });
    onRefresh();
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="glass-card p-4">
            <div className="h-16 bg-white/10 rounded animate-pulse" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
          <Input
            placeholder="Search transactions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white/10 border-white/20 text-white"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-32 bg-white/10 border-white/20 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <AnimatePresence>
        {filtered.map((tx, idx) => (
          <motion.div
            key={tx.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ delay: idx * 0.03 }}
          >
            <Card className="glass-card p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="text-white font-medium">{tx.description || "Untitled"}</p>
                  <p className="text-white/50 text-xs">
                    {formatDate(tx.date)} • {tx.category || "Uncategorized"}
                  </p>
                  {tx.tags && tx.tags.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {tx.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="text-xs bg-white/10 px-1.5 py-0.5 rounded-full text-white/70"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <p
                    className={`font-bold ${tx.amount > 0 ? "text-green-400" : "text-red-400"
                      }`}
                  >
                    {tx.amount > 0 ? "+" : "-"}
                    {formatNPR(Math.abs(tx.amount))}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(tx.id)}
                    className="text-white/50 hover:text-red-400 mt-1"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>

      {filtered.length === 0 && !loading && (
        <Card className="glass-card p-8 text-center">
          <p className="text-white/50">No transactions found</p>
        </Card>
      )}
    </div>
  );
}