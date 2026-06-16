"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Plus, HandCoins, Trash2, ArrowDownLeft, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { useDebts } from "@/hooks/useDebts";
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
import { DebtPayoffSimulator } from "@/components/debts/DebtPayoffSimulator";
import { formatNPR, parseLocalDate } from "@/lib/utils";
import { toast } from "sonner";
import { Debt } from "@/types";

export default function DebtsPage() {
  const { debts, loading, fetchDebts, createDebt, recordPayment, deleteDebt, updateDebtEntry } = useDebts();
  const [isOpen, setIsOpen] = useState(false);
  const [person, setPerson] = useState("");
  const [direction, setDirection] = useState<Debt["direction"]>("owed_by_me");
  const [principal, setPrincipal] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const [paymentDebt, setPaymentDebt] = useState<Debt | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");

  useEffect(() => {
    fetchDebts();
  }, []);

  const activeDebts = useMemo(() => debts.filter((d) => !d.is_settled), [debts]);

  const totalOwedByMe = useMemo(
    () => activeDebts.filter((d) => d.direction === "owed_by_me").reduce((sum, d) => sum + d.remaining_amount, 0),
    [activeDebts]
  );
  const totalOwedToMe = useMemo(
    () => activeDebts.filter((d) => d.direction === "owed_to_me").reduce((sum, d) => sum + d.remaining_amount, 0),
    [activeDebts]
  );

  const handleCreate = async () => {
    const principal_amount = parseFloat(principal);
    if (!person.trim()) {
      toast.error("Enter a name");
      return;
    }
    if (!principal_amount || principal_amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setSaving(true);
    const { error } = await createDebt({
      person: person.trim(),
      direction,
      principal_amount,
      interest_rate: interestRate ? parseFloat(interestRate) : null,
      due_date: dueDate || null,
      notes: notes.trim() || null,
    });
    if (error) {
      toast.error("Failed to add: " + error.message);
    } else {
      toast.success(direction === "owed_by_me" ? "Loan added!" : "Lent amount recorded!");
      setIsOpen(false);
      setPerson("");
      setPrincipal("");
      setInterestRate("");
      setDueDate("");
      setNotes("");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this record?")) {
      await deleteDebt(id);
      toast.success("Removed");
    }
  };

  const handlePayment = async () => {
    if (!paymentDebt) return;
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    const { error } = await recordPayment(paymentDebt.id, amount);
    if (error) {
      toast.error("Failed: " + error.message);
    } else {
      toast.success("Payment recorded!");
      setPaymentDebt(null);
      setPaymentAmount("");
    }
  };

  const handleToggleSettled = async (debt: Debt) => {
    await updateDebtEntry(debt.id, { is_settled: !debt.is_settled });
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
            <Button size="icon" aria-label="Add debt or loan">
              <Plus className="h-5 w-5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Track a Debt or Loan</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={direction} onValueChange={(v) => setDirection(v as Debt["direction"])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owed_by_me">Money I borrowed (I owe)</SelectItem>
                    <SelectItem value="owed_to_me">Money I lent (owed to me)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Person / Lender</Label>
                <Input
                  placeholder="e.g. Ramesh, ABC Bank"
                  value={person}
                  onChange={(e) => setPerson(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Amount (NPR)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="50000"
                  value={principal}
                  onChange={(e) => setPrincipal(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Interest Rate % (optional)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Due Date (optional)</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Notes (optional)</Label>
                <Input
                  placeholder="e.g. for car repair"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <Button onClick={handleCreate} disabled={saving} className="w-full">
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Overview cards */}
      {activeDebts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="p-5 sm:p-8 bg-gradient-to-br from-destructive/10 via-card to-card">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center text-destructive">
                <ArrowUpRight className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">You Owe</p>
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight text-foreground tabular-nums">{formatNPR(totalOwedByMe)}</h2>
          </Card>
          <Card className="p-5 sm:p-8 bg-gradient-to-br from-primary/15 via-card to-card">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center text-primary">
                <ArrowDownLeft className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">Owed to You</p>
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight text-foreground tabular-nums">{formatNPR(totalOwedToMe)}</h2>
          </Card>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="text-muted-foreground text-center py-12">Loading...</div>
      ) : debts.length === 0 ? (
        <Card className="p-5 sm:p-8 text-center text-muted-foreground">
          No debts or loans tracked yet. Add one to keep tabs on what you owe and what's owed to you.
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {debts.map((debt, idx) => {
            const percentage = debt.principal_amount > 0
              ? Math.min(((debt.principal_amount - debt.remaining_amount) / debt.principal_amount) * 100, 100)
              : 0;
            const isSettled = debt.is_settled;
            const daysLeft = debt.due_date
              ? Math.ceil((parseLocalDate(debt.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              : null;
            const isOwedByMe = debt.direction === "owed_by_me";

            return (
              <motion.div
                key={debt.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
              >
                <Card className="p-5 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isSettled ? "bg-primary text-primary-foreground" : isOwedByMe ? "bg-destructive/10 text-destructive" : "bg-primary/15 text-primary"
                      }`}>
                        {isSettled ? <CheckCircle2 className="w-4 h-4" /> : <HandCoins className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground truncate">{debt.person}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {isOwedByMe ? "You owe" : "Owes you"} &middot; {formatNPR(debt.remaining_amount)} of {formatNPR(debt.principal_amount)}
                          {debt.interest_rate ? ` @ ${debt.interest_rate}%` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className={`text-sm font-bold ${isSettled ? "text-primary" : "text-foreground"}`}>
                        {Math.round(percentage)}%
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(debt.id)}
                        aria-label="Delete record"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <Progress
                    value={percentage}
                    indicatorClassName={isSettled ? "bg-primary" : isOwedByMe ? "bg-destructive" : "bg-accent"}
                  />
                  {debt.notes && <p className="text-xs text-muted-foreground">{debt.notes}</p>}
                  {isOwedByMe && !isSettled && <DebtPayoffSimulator debt={debt} />}
                  <div className="flex items-center justify-between gap-2">
                    {debt.due_date ? (
                      <p className="text-xs text-muted-foreground">
                        {isSettled
                          ? "Settled"
                          : daysLeft !== null && daysLeft >= 0
                            ? `Due in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`
                            : "Overdue"}
                      </p>
                    ) : (
                      <span />
                    )}
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleToggleSettled(debt)}>
                        {isSettled ? "Mark active" : "Mark settled"}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          setPaymentDebt(debt);
                          setPaymentAmount("");
                        }}
                      >
                        Record payment
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Payment dialog */}
      <Dialog open={!!paymentDebt} onOpenChange={(open) => !open && setPaymentDebt(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment &mdash; {paymentDebt?.person}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Amount Paid (NPR)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="5000"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Reduces the remaining balance of {formatNPR(paymentDebt?.remaining_amount || 0)}.
              </p>
            </div>
            <Button onClick={handlePayment} className="w-full">
              Record Payment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
