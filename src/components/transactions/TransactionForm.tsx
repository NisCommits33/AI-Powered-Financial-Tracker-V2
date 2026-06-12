"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { z } from "zod";
import { transactionSchema } from "@/lib/validations";
import { useAccounts } from "@/hooks/useAccounts";
import { useTransactions } from "@/hooks/useTransactions";
import { toast } from "sonner";
import { Transaction } from "@/types";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/categories";

type TransactionFormData = Omit<Transaction, "id" | "created_at">;

interface TransactionFormProps {
    onSuccess?: () => void;
    initialData?: Partial<TransactionFormData>;
}

type TxType = "expense" | "income";

export function TransactionForm({ onSuccess, initialData }: TransactionFormProps) {
    const { accounts, fetchAccounts } = useAccounts();
    const { createTransaction } = useTransactions();
    const [loading, setLoading] = useState(false);
    const [type, setType] = useState<TxType>(
        initialData?.amount !== undefined && initialData.amount > 0 ? "income" : "expense"
    );

    const categories = type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
    } = useForm<z.output<typeof transactionSchema>>({
        resolver: zodResolver(transactionSchema) as any,
        defaultValues: {
            amount: initialData?.amount ? Math.abs(initialData.amount) : 0,
            description: initialData?.description || "",
            category: initialData?.category || (type === "expense" ? "Food" : "Salary"),
            date: initialData?.date || new Date().toISOString().split("T")[0],
            account_id: initialData?.account_id || "",
            tags: initialData?.tags || [],
        },
    });

    useEffect(() => {
        fetchAccounts();
    }, []);

    // Every transaction must belong to an account (otherwise it never moves a
    // balance), so default to the first account once accounts have loaded.
    useEffect(() => {
        if (!watch("account_id") && accounts.length > 0) {
            setValue("account_id", accounts[0].id);
        }
    }, [accounts]);

    // Reset category to a sensible default for the new type if it's no longer valid
    useEffect(() => {
        const current = watch("category");
        if (!categories.includes(current)) {
            setValue("category", categories[0]);
        }
    }, [type]);

    const onSubmit = async (data: z.output<typeof transactionSchema>) => {
        setLoading(true);
        const signedAmount = type === "expense" ? -Math.abs(data.amount) : Math.abs(data.amount);
        const { error } = await createTransaction({
            amount: signedAmount,
            description: data.description,
            category: data.category,
            date: data.date,
            account_id: data.account_id,
            tags: type === "income" ? [] : data.tags,
        });
        if (error) {
            toast.error("Failed to create transaction: " + error.message);
        } else {
            toast.success(type === "income" ? "Income added!" : "Expense added!");
            onSuccess?.();
        }
        setLoading(false);
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Income / Expense tabs */}
            <div className="inline-flex w-full items-center gap-1 rounded-xl bg-muted p-1">
                <button
                    type="button"
                    onClick={() => setType("expense")}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        type === "expense"
                            ? "bg-card text-destructive shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                    <ArrowUpRight className="h-4 w-4 rotate-180" />
                    Expense
                </button>
                <button
                    type="button"
                    onClick={() => setType("income")}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        type === "income"
                            ? "bg-card text-primary shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                    <ArrowDownRight className="h-4 w-4 rotate-180" />
                    Income
                </button>
            </div>

            <div className="space-y-1.5">
                <Label>Amount (NPR)</Label>
                <Input
                    type="number"
                    step="0.01"
                    min="0"
                    {...register("amount", { valueAsNumber: true })}
                />
                {errors.amount && <p className="text-destructive text-xs mt-1">{errors.amount.message}</p>}
            </div>

            <div className="space-y-1.5">
                <Label>Description</Label>
                <Input
                    placeholder={type === "income" ? "e.g. June salary" : "e.g. Lunch at cafe"}
                    {...register("description")}
                />
                {errors.description && (
                    <p className="text-destructive text-xs mt-1">{errors.description.message}</p>
                )}
            </div>

            <div className="space-y-1.5">
                <Label>{type === "income" ? "Source" : "Category"}</Label>
                <Select onValueChange={(v) => setValue("category", v)} value={watch("category")}>
                    <SelectTrigger>
                        <SelectValue placeholder={type === "income" ? "Select source" : "Select category"} />
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
                <Label>Date</Label>
                <Input type="date" {...register("date")} />
            </div>

            <div className="space-y-1.5">
                <Label>Account</Label>
                <Select onValueChange={(v) => setValue("account_id", v)} value={watch("account_id")}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                        {accounts
                            .filter((a) => !a.is_archived)
                            .map((acc) => (
                                <SelectItem key={acc.id} value={acc.id}>
                                    {acc.name}
                                </SelectItem>
                            ))}
                    </SelectContent>
                </Select>
                {errors.account_id && (
                    <p className="text-destructive text-xs mt-1">{errors.account_id.message}</p>
                )}
            </div>

            {type === "expense" && (
                <div className="space-y-1.5">
                    <Label>Tags (comma separated)</Label>
                    <Input
                        placeholder="groceries, recurring"
                        onChange={(e) =>
                            setValue(
                                "tags",
                                e.target.value.split(",").map((t) => t.trim()).filter(Boolean)
                            )
                        }
                    />
                </div>
            )}

            <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Saving..." : type === "income" ? "Add Income" : "Add Expense"}
            </Button>
        </form>
    );
}
