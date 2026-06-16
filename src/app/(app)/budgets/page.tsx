"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Plus, Target, Trash2 } from "lucide-react";
import { useBudgets } from "@/hooks/useBudgets";
import { useTransactions } from "@/hooks/useTransactions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatNPR, withComputedSpent, currentMonthStart } from "@/lib/utils";
import { EXPENSE_CATEGORIES } from "@/lib/categories";
import { toast } from "sonner";

const categories = EXPENSE_CATEGORIES;

export default function BudgetsPage() {
  const { budgets, loading, fetchBudgets, createBudget, deleteBudget } = useBudgets();
  const { transactions, fetchTransactions } = useTransactions();
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState("Food");
  const [limit, setLimit] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchBudgets();
    fetchTransactions();
  }, []);

  const computedBudgets = useMemo(
    () => withComputedSpent(budgets, transactions),
    [budgets, transactions]
  );

  const totalLimit = useMemo(
    () => computedBudgets.reduce((sum, b) => sum + b.monthly_limit, 0),
    [computedBudgets]
  );
  const totalSpent = useMemo(
    () => computedBudgets.reduce((sum, b) => sum + b.spent, 0),
    [computedBudgets]
  );

  const handleCreate = async () => {
    const monthly_limit = parseFloat(limit);
    if (!monthly_limit || monthly_limit <= 0) {
      toast.error("Enter a valid monthly limit");
      return;
    }
    setSaving(true);
    const { error } = await createBudget({
      category,
      monthly_limit,
      spent: 0,
      month: currentMonthStart(),
    });
    if (error) {
      toast.error("Failed to create budget: " + error.message);
    } else {
      toast.success("Budget created!");
      setIsOpen(false);
      setLimit("");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Remove this budget?")) {
      await deleteBudget(id);
      toast.success("Budget removed");
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full text-foreground pb-8">
      {/* Action bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end -mt-2"
      >
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="icon" aria-label="Add budget">
              <Plus className="h-5 w-5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>New Monthly Budget</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
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
              <div className="space-y-1.5">
                <Label>Monthly Limit (NPR)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="10000"
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                />
              </div>
              <Button onClick={handleCreate} disabled={saving} className="w-full">
                {saving ? "Saving..." : "Create Budget"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Overview card */}
      {budgets.length > 0 && (
        <Card className="p-5 sm:p-8 bg-gradient-to-br from-primary/15 via-card to-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center text-primary">
              <Target className="w-4 h-4" />
            </div>
            <p className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">Total Spent This Month</p>
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight text-foreground tabular-nums">
            {formatNPR(totalSpent)}
            <span className="text-base font-semibold text-muted-foreground"> / {formatNPR(totalLimit)}</span>
          </h2>
          <Progress
            value={totalLimit > 0 ? Math.min((totalSpent / totalLimit) * 100, 100) : 0}
            className="mt-4 h-2.5"
            indicatorClassName={totalSpent > totalLimit ? "bg-destructive" : "bg-primary"}
          />
        </Card>
      )}

      {/* Budget list */}
      {loading ? (
        <div className="text-muted-foreground text-center py-12">Loading budgets...</div>
      ) : budgets.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          No budgets set yet. Create one to start tracking your spending.
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {computedBudgets.map((budget, idx) => {
            const percentage = budget.monthly_limit > 0
              ? Math.min((budget.spent / budget.monthly_limit) * 100, 100)
              : 0;
            const overBudget = budget.spent > budget.monthly_limit;
            const nearLimit = percentage >= 80;

            return (
              <motion.div
                key={budget.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
              >
                <Card className="p-5 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-foreground">{budget.category}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatNPR(budget.spent)} of {formatNPR(budget.monthly_limit)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-bold ${
                          overBudget ? "text-destructive" : nearLimit ? "text-accent" : "text-primary"
                        }`}
                      >
                        {Math.round(percentage)}%
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(budget.id)}
                        aria-label="Delete budget"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <Progress
                    value={percentage}
                    indicatorClassName={overBudget ? "bg-destructive" : nearLimit ? "bg-accent" : "bg-primary"}
                  />
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
