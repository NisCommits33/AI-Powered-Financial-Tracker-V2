"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Plus, Goal as GoalIcon, Trash2, PiggyBank, CheckCircle2, Pencil } from "lucide-react";
import { useGoals } from "@/hooks/useGoals";
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
import { formatNPR, parseLocalDate } from "@/lib/utils";
import { toast } from "sonner";
import { Goal } from "@/types";

export default function GoalsPage() {
  const { goals, loading, fetchGoals, createGoal, contributeToGoal, deleteGoal, updateGoalEntry } = useGoals();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [saving, setSaving] = useState(false);

  const [contributeGoal, setContributeGoal] = useState<Goal | null>(null);
  const [contributeAmount, setContributeAmount] = useState("");

  useEffect(() => {
    fetchGoals();
  }, []);

  const totalSaved = useMemo(() => goals.reduce((sum, g) => sum + g.current_amount, 0), [goals]);
  const totalTarget = useMemo(() => goals.reduce((sum, g) => sum + g.target_amount, 0), [goals]);

  const handleCreate = async () => {
    const target_amount = parseFloat(targetAmount);
    if (!name.trim()) {
      toast.error("Enter a goal name");
      return;
    }
    if (!target_amount || target_amount <= 0) {
      toast.error("Enter a valid target amount");
      return;
    }
    setSaving(true);
    const { error } = await createGoal({
      name: name.trim(),
      target_amount,
      target_date: targetDate || null,
    });
    if (error) {
      toast.error("Failed to create goal: " + error.message);
    } else {
      toast.success("Goal created!");
      setIsOpen(false);
      setName("");
      setTargetAmount("");
      setTargetDate("");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this goal?")) {
      await deleteGoal(id);
      toast.success("Goal deleted");
    }
  };

  const handleContribute = async () => {
    if (!contributeGoal) return;
    const amount = parseFloat(contributeAmount);
    if (!amount || amount === 0) {
      toast.error("Enter a valid amount");
      return;
    }
    const { error } = await contributeToGoal(contributeGoal.id, amount);
    if (error) {
      toast.error("Failed to update goal: " + error.message);
    } else {
      toast.success(amount > 0 ? "Funds added to goal!" : "Funds withdrawn from goal");
      setContributeGoal(null);
      setContributeAmount("");
    }
  };

  const handleToggleComplete = async (goal: Goal) => {
    await updateGoalEntry(goal.id, { is_completed: !goal.is_completed });
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
            <Button size="icon" aria-label="Add goal">
              <Plus className="h-5 w-5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>New Savings Goal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Goal Name</Label>
                <Input
                  placeholder="e.g. Emergency Fund, New Laptop, Trip to Pokhara"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Target Amount (NPR)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="100000"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Target Date (optional)</Label>
                <Input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                />
              </div>
              <Button onClick={handleCreate} disabled={saving} className="w-full">
                {saving ? "Saving..." : "Create Goal"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Overview card */}
      {goals.length > 0 && (
        <Card className="p-5 sm:p-8 bg-gradient-to-br from-primary/15 via-card to-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center text-primary">
              <PiggyBank className="w-4 h-4" />
            </div>
            <p className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">Total Saved Toward Goals</p>
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight text-foreground tabular-nums">
            {formatNPR(totalSaved)}
            <span className="text-base font-semibold text-muted-foreground"> / {formatNPR(totalTarget)}</span>
          </h2>
          <Progress
            value={totalTarget > 0 ? Math.min((totalSaved / totalTarget) * 100, 100) : 0}
            className="mt-4 h-2.5"
          />
        </Card>
      )}

      {/* Goals list */}
      {loading ? (
        <div className="text-muted-foreground text-center py-12">Loading goals...</div>
      ) : goals.length === 0 ? (
        <Card className="p-5 sm:p-8 text-center text-muted-foreground">
          No savings goals yet. Create one to start tracking your progress.
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {goals.map((goal, idx) => {
            const percentage = goal.target_amount > 0
              ? Math.min((goal.current_amount / goal.target_amount) * 100, 100)
              : 0;
            const isComplete = goal.is_completed || percentage >= 100;
            const daysLeft = goal.target_date
              ? Math.ceil((parseLocalDate(goal.target_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              : null;

            return (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
              >
                <Card className="p-5 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isComplete ? "bg-primary text-primary-foreground" : "bg-primary/15 text-primary"}`}>
                        {isComplete ? <CheckCircle2 className="w-4 h-4" /> : <GoalIcon className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground truncate">{goal.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatNPR(goal.current_amount)} of {formatNPR(goal.target_amount)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className={`text-sm font-bold ${isComplete ? "text-primary" : "text-foreground"}`}>
                        {Math.round(percentage)}%
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(goal.id)}
                        aria-label="Delete goal"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <Progress
                    value={percentage}
                    indicatorClassName={isComplete ? "bg-primary" : "bg-accent"}
                  />
                  <div className="flex items-center justify-between gap-2">
                    {goal.target_date ? (
                      <p className="text-xs text-muted-foreground">
                        {isComplete
                          ? "Goal reached!"
                          : daysLeft !== null && daysLeft >= 0
                            ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`
                            : "Target date passed"}
                      </p>
                    ) : (
                      <span />
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleComplete(goal)}
                      >
                        {isComplete ? "Mark active" : "Mark done"}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          setContributeGoal(goal);
                          setContributeAmount("");
                        }}
                      >
                        Add funds
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Contribute dialog */}
      <Dialog open={!!contributeGoal} onOpenChange={(open) => !open && setContributeGoal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update "{contributeGoal?.name}"</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Amount (NPR)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="5000"
                value={contributeAmount}
                onChange={(e) => setContributeAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter a positive amount to add funds, or a negative amount to withdraw.
              </p>
            </div>
            <Button onClick={handleContribute} className="w-full">
              Update Goal
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
