"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Account } from "@/types";
import { useTransactions } from "@/hooks/useTransactions";
import { toast } from "sonner";
import { formatNPR } from "@/lib/utils";

const transferSchema = z
  .object({
    from_account_id: z.string().min(1, "Select an account"),
    to_account_id: z.string().min(1, "Select an account"),
    amount: z.coerce.number({ error: "Amount must be a number" }).positive("Amount must be greater than 0"),
    date: z.string().min(1, "Date is required"),
  })
  .refine((data) => data.from_account_id !== data.to_account_id, {
    message: "Choose two different accounts",
    path: ["to_account_id"],
  });

type TransferFormData = z.infer<typeof transferSchema>;

interface TransferFormProps {
  accounts: Account[];
  onSuccess?: () => void;
}

export function TransferForm({ accounts, onSuccess }: TransferFormProps) {
  const { createTransaction, loading } = useTransactions();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    setError,
  } = useForm<TransferFormData>({
    resolver: zodResolver(transferSchema) as any,
    defaultValues: {
      from_account_id: accounts[0]?.id || "",
      to_account_id: accounts[1]?.id || "",
      amount: 0,
      date: new Date().toISOString().slice(0, 10),
    },
  });

  const fromAccountId = watch("from_account_id");
  const toAccountId = watch("to_account_id");
  const watchedAmount = Number(watch("amount") || 0);
  const selectedFromAccount = accounts.find((a) => a.id === fromAccountId);
  const hasInsufficientFunds =
    Boolean(selectedFromAccount) && watchedAmount > 0 && selectedFromAccount!.balance < watchedAmount;

  const onSubmit = async (data: TransferFormData) => {
    const fromAccount = accounts.find((a) => a.id === data.from_account_id);
    const toAccount = accounts.find((a) => a.id === data.to_account_id);
    if (!fromAccount || !toAccount) return;
    if (fromAccount.balance < data.amount) {
      const message = `Insufficient balance in ${fromAccount.name}. Available: ${formatNPR(fromAccount.balance)}.`;
      setError("amount", { type: "manual", message });
      toast.error(message);
      return;
    }

    const { error: outError } = await createTransaction({
      amount: -Math.abs(data.amount),
      description: `Transfer to ${toAccount.name}`,
      category: "Other",
      date: data.date,
      account_id: fromAccount.id,
      tags: ["transfer"],
    });
    if (outError) {
      toast.error(outError.message || "Failed to create transfer");
      return;
    }

    const { error: inError } = await createTransaction({
      amount: Math.abs(data.amount),
      description: `Transfer from ${fromAccount.name}`,
      category: "Other",
      date: data.date,
      account_id: toAccount.id,
      tags: ["transfer"],
    });
    if (inError) {
      toast.error(inError.message || "Failed to create transfer");
      return;
    }

    toast.success("Transfer complete!");
    onSuccess?.();
  };

  if (accounts.length < 2) {
    return (
      <p className="text-sm text-muted-foreground">
        You need at least two accounts to transfer funds.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* From Account */}
      <div className="space-y-2">
        <Label>From</Label>
        <Select value={fromAccountId} onValueChange={(v) => setValue("from_account_id", v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select account" />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name} · {formatNPR(a.balance)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.from_account_id && (
          <p className="text-destructive text-sm">{errors.from_account_id.message}</p>
        )}
      </div>

      {/* To Account */}
      <div className="space-y-2">
        <Label>To</Label>
        <Select value={toAccountId} onValueChange={(v) => setValue("to_account_id", v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select account" />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.to_account_id && (
          <p className="text-destructive text-sm">{errors.to_account_id.message}</p>
        )}
      </div>

      {/* Amount */}
      <div className="space-y-2">
        <Label htmlFor="amount">Amount (NPR)</Label>
        <Input id="amount" type="number" placeholder="0" step="0.01" min="0.01" {...register("amount")} />
        {selectedFromAccount && (
          <p className="text-xs text-muted-foreground">
            Available in {selectedFromAccount.name}: {formatNPR(selectedFromAccount.balance)}
          </p>
        )}
        {errors.amount && <p className="text-destructive text-sm">{errors.amount.message}</p>}
        {hasInsufficientFunds && !errors.amount && (
          <p className="text-destructive text-sm">Transfer amount exceeds the source account balance.</p>
        )}
      </div>

      {/* Date */}
      <div className="space-y-2">
        <Label htmlFor="date">Date</Label>
        <Input id="date" type="date" {...register("date")} />
        {errors.date && <p className="text-destructive text-sm">{errors.date.message}</p>}
      </div>

      <Button type="submit" disabled={loading || hasInsufficientFunds} className="w-full">
        {loading ? "Transferring..." : "Transfer"}
      </Button>
    </form>
  );
}
