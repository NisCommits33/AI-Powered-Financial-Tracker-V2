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

type TransactionFormData = Omit<Transaction, "id" | "created_at">;

interface TransactionFormProps {
    onSuccess?: () => void;
    initialData?: Partial<TransactionFormData>;
}

const categories = [
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

export function TransactionForm({ onSuccess, initialData }: TransactionFormProps) {
    const { accounts, fetchAccounts } = useAccounts();
    const { createTransaction } = useTransactions();
    const [loading, setLoading] = useState(false);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
    } = useForm<z.output<typeof transactionSchema>>({
        resolver: zodResolver(transactionSchema) as any,
        defaultValues: {
            amount: initialData?.amount || 0,
            description: initialData?.description || "",
            category: initialData?.category || "Other",
            date: initialData?.date || new Date().toISOString().split("T")[0],
            account_id: initialData?.account_id || "",
            tags: initialData?.tags || [],
        },
    });

    useEffect(() => {
        fetchAccounts();
    }, []);

    const onSubmit = async (data: z.output<typeof transactionSchema>) => {
        setLoading(true);
        const { error } = await createTransaction({
            amount: data.amount,
            description: data.description,
            category: data.category,
            date: data.date,
            account_id: data.account_id || undefined,
            tags: data.tags,
        });
        if (error) {
            toast.error("Failed to create transaction: " + error.message);
        } else {
            toast.success("Transaction added!");
            onSuccess?.();
        }
        setLoading(false);
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
                <Label>Amount (NPR)</Label>
                <Input
                    type="number"
                    step="0.01"
                    {...register("amount", { valueAsNumber: true })}
                    className="bg-white/10 border-white/20 text-white"
                />
                {errors.amount && <p className="text-red-400 text-xs mt-1">{errors.amount.message}</p>}
            </div>

            <div>
                <Label>Description</Label>
                <Input {...register("description")} className="bg-white/10 border-white/20 text-white" />
                {errors.description && (
                    <p className="text-red-400 text-xs mt-1">{errors.description.message}</p>
                )}
            </div>

            <div>
                <Label>Category</Label>
                <Select onValueChange={(v) => setValue("category", v)} value={watch("category")}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Select category" />
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

            <div>
                <Label>Date</Label>
                <Input type="date" {...register("date")} className="bg-white/10 border-white/20 text-white" />
            </div>

            <div>
                <Label>Account</Label>
                <Select onValueChange={(v) => setValue("account_id", v)} value={watch("account_id")}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
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
            </div>

            <div>
                <Label>Tags (comma separated)</Label>
                <Input
                    placeholder="groceries, urgent"
                    onChange={(e) =>
                        setValue(
                            "tags",
                            e.target.value.split(",").map((t) => t.trim())
                        )
                    }
                    className="bg-white/10 border-white/20 text-white"
                />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Saving..." : "Save Transaction"}
            </Button>
        </form>
    );
}