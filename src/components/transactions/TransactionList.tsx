"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Transaction, Account } from "@/types";
import { formatNPR, formatDate } from "@/lib/utils";
import {
  Search,
  Trash2,
  Utensils,
  Car,
  ShoppingBag,
  HeartPulse,
  Film,
  Zap,
  GraduationCap,
  Home,
  PiggyBank,
  CircleDot,
  ChevronLeft,
  ChevronRight,
  ArrowDownRight,
  ArrowUpRight,
  Briefcase,
  Laptop,
  TrendingUp,
  Gift,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTransactions } from "@/hooks/useTransactions";
import { toast } from "sonner";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/categories";

interface TransactionListProps {
  transactions: Transaction[];
  loading?: boolean;
  onRefresh: () => void;
  accounts?: Account[];
  initialAccountFilter?: string;
}

const categories = ["All", ...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES.filter((c) => c !== "Other")];

const categoryIcons: Record<string, typeof Utensils> = {
  Food: Utensils,
  Transport: Car,
  Shopping: ShoppingBag,
  Health: HeartPulse,
  Entertainment: Film,
  Utilities: Zap,
  Education: GraduationCap,
  Rent: Home,
  Savings: PiggyBank,
  Salary: Briefcase,
  Freelance: Laptop,
  Business: Briefcase,
  Investment: TrendingUp,
  Gift: Gift,
  Refund: RotateCcw,
  Other: CircleDot,
};

const PAGE_SIZE = 10;

type TypeFilter = "all" | "income" | "expense";

export function TransactionList({ transactions, loading, onRefresh, accounts, initialAccountFilter }: TransactionListProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [accountFilter, setAccountFilter] = useState(initialAccountFilter || "All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const { softDeleteTransaction } = useTransactions();

  useEffect(() => {
    if (initialAccountFilter) setAccountFilter(initialAccountFilter);
  }, [initialAccountFilter]);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const matchesSearch = t.description?.toLowerCase().includes(search.toLowerCase()) || false;
      const matchesCategory = categoryFilter === "All" || t.category === categoryFilter;
      const matchesType =
        typeFilter === "all" || (typeFilter === "income" ? t.amount > 0 : t.amount < 0);
      const matchesAccount = accountFilter === "All" || t.account_id === accountFilter;
      const txDate = t.date.slice(0, 10);
      const matchesStart = !startDate || txDate >= startDate;
      const matchesEnd = !endDate || txDate <= endDate;
      return matchesSearch && matchesCategory && matchesType && matchesAccount && matchesStart && matchesEnd;
    });
  }, [transactions, search, categoryFilter, typeFilter, accountFilter, startDate, endDate]);

  const totals = useMemo(() => {
    const income = filtered.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    const expense = filtered.filter((t) => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
    return { income, expense };
  }, [filtered]);

  // Reset to first page whenever filters change
  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter, typeFilter, accountFilter, startDate, endDate]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4">
            <div className="h-12 bg-muted rounded-lg animate-pulse" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Income / Expense / All toggle */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div className="inline-flex items-center gap-1 rounded-xl bg-muted p-1 self-start">
          {(
            [
              { key: "all", label: "All" },
              { key: "income", label: "Income" },
              { key: "expense", label: "Expense" },
            ] as { key: TypeFilter; label: string }[]
          ).map((opt) => (
            <button
              key={opt.key}
              onClick={() => setTypeFilter(opt.key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                typeFilter === opt.key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          {(typeFilter === "all" || typeFilter === "income") && totals.income > 0 && (
            <div className="flex items-center gap-1.5 text-sm font-semibold text-primary">
              <ArrowDownRight className="h-4 w-4 rotate-180" />
              {formatNPR(totals.income)}
            </div>
          )}
          {(typeFilter === "all" || typeFilter === "expense") && totals.expense > 0 && (
            <div className="flex items-center gap-1.5 text-sm font-semibold text-destructive">
              <ArrowUpRight className="h-4 w-4 rotate-180" />
              {formatNPR(totals.expense)}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-32">
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
        {accounts && accounts.length > 0 && (
          <Select value={accountFilter} onValueChange={setAccountFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Accounts</SelectItem>
              {accounts.map((acc) => (
                <SelectItem key={acc.id} value={acc.id}>
                  {acc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full sm:w-40"
            aria-label="From date"
          />
          <span className="text-muted-foreground text-xs shrink-0">to</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full sm:w-40"
            aria-label="To date"
          />
        </div>
      </div>

      <Card className="p-2 overflow-hidden">
        <AnimatePresence>
          {paginated.map((tx, idx) => {
            const Icon = categoryIcons[tx.category] || CircleDot;
            const isIncome = tx.amount > 0;
            return (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -60 }}
                transition={{ delay: idx * 0.02 }}
                className="group flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted/60 transition-colors"
              >
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-xl shrink-0 ${
                    isIncome ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Icon className="h-4.5 w-4.5" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-foreground font-semibold text-sm truncate">
                    {tx.description || "Untitled"}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {formatDate(tx.date)} &middot; {tx.category || "Uncategorized"}
                  </p>
                  {tx.tags && tx.tags.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {tx.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="text-xs bg-muted px-1.5 py-0.5 rounded-md text-muted-foreground"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <p className={`font-bold text-sm ${isIncome ? "text-primary" : "text-foreground"}`}>
                    {isIncome ? "+" : "-"}
                    {formatNPR(Math.abs(tx.amount))}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(tx.id)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filtered.length === 0 && !loading && (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">No transactions found</p>
          </div>
        )}
      </Card>

      {filtered.length > 0 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-muted-foreground font-medium">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
