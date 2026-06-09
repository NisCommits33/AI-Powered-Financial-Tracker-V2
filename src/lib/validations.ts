import { z } from "zod";

export const transactionSchema = z.object({
  amount: z.number({ error: "Amount is required" }).positive("Amount must be positive"),
  description: z.string().min(1, "Description is required"),
  category: z.string().min(1, "Category is required"),
  date: z.string().date("Invalid date format"),
  account_id: z.string().uuid().optional(),
  tags: z.array(z.string()).default([]),
});

export type TransactionFormData = z.infer<typeof transactionSchema>;