import { z } from "zod";

export const transactionSchema = z.object({
  amount: z.number({ error: "Amount is required" }).refine((v) => v !== 0, "Amount cannot be zero"),
  description: z.string().min(1, "Description is required"),
  category: z.string().min(1, "Category is required"),
  date: z.string().date("Invalid date format"),
  // Required: an unlinked transaction would move income/expense totals but never
  // touch an account balance, silently desyncing net worth from the data.
  account_id: z.string().uuid("Please select an account"),
  tags: z.array(z.string()).default([]),
});

export type TransactionFormData = z.infer<typeof transactionSchema>;