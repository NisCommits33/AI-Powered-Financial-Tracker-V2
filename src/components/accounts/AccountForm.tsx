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
import { useAccounts } from "@/hooks/useAccounts";
import { useState } from "react";

const accountSchema = z.object({
  name: z.string().min(1, "Account name is required"),
  type: z.enum(["checking", "savings", "cash", "ewallet"]),
  balance: z.coerce.number({ error: "Balance must be a number" }),
  currency: z.string().default("NPR"),
  color_tag: z.string().optional(),
});

type AccountFormData = Omit<Account, "id" | "created_at" | "is_archived">;

interface AccountFormProps {
  account?: Account;
  onSuccess?: () => void;
}

export function AccountForm({ account, onSuccess }: AccountFormProps) {
  const { addAccount, updateAccountEntry, loading } = useAccounts();
  const [selectedType, setSelectedType] = useState(account?.type || "checking");
  const [selectedColor, setSelectedColor] = useState(account?.color_tag || "#3b82f6");

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema) as any,
    defaultValues: account || {
      name: "",
      type: "checking",
      balance: 0,
      currency: "NPR",
      color_tag: "#3b82f6",
    },
  });

  const colors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

  const onSubmit = async (data: AccountFormData) => {
    try {
      const formData = {
        ...data,
        type: selectedType as "checking" | "savings" | "cash" | "ewallet",
        color_tag: selectedColor,
      };

      if (account?.id) {
        // Update existing account
        await updateAccountEntry(account.id, formData);
      } else {
        // Create new account
        await addAccount(formData);
      }
      onSuccess?.();
    } catch (error) {
      console.error("Error saving account:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Account Name */}
      <div className="space-y-2">
        <Label htmlFor="name">
          Account Name
        </Label>
        <Input
          id="name"
          placeholder="e.g., Checking Account"
          {...register("name")}
        />
        {errors.name && (
          <p className="text-destructive text-sm">{errors.name.message}</p>
        )}
      </div>

      {/* Type */}
      <div className="space-y-2">
        <Label htmlFor="type">
          Account Type
        </Label>
        <Select value={selectedType} onValueChange={(v) => setSelectedType(v as Account["type"])}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="checking">Checking</SelectItem>
            <SelectItem value="savings">Savings</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="ewallet">E-wallet</SelectItem>
          </SelectContent>
        </Select>
        {errors.type && (
          <p className="text-destructive text-sm">{errors.type.message}</p>
        )}
      </div>

      {/* Balance */}
      <div className="space-y-2">
        <Label htmlFor="balance">
          Balance (NPR)
        </Label>
        <Input
          id="balance"
          type="number"
          placeholder="0"
          step="0.01"
          {...register("balance")}
        />
        {errors.balance && (
          <p className="text-destructive text-sm">{errors.balance.message}</p>
        )}
      </div>

      {/* Color Tag */}
      <div className="space-y-2">
        <Label>Color Tag</Label>
        <div className="flex gap-2 flex-wrap">
          {colors.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setSelectedColor(color)}
              className={`w-8 h-8 rounded-full border-2 transition-all ${
                selectedColor === color
                  ? "border-foreground scale-110"
                  : "border-border"
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full"
      >
        {loading ? "Saving..." : account ? "Update Account" : "Add Account"}
      </Button>
    </form>
  );
}
