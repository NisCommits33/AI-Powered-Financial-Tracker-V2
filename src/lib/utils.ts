import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Budget, Transaction } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNPR(amount: number): string {
  return new Intl.NumberFormat("en-NP", {
    style: "currency",
    currency: "NPR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Returns budgets with `spent` recalculated from actual expense transactions
 * in the budget's month, since the stored `spent` column is never updated.
 */
export function withComputedSpent(budgets: Budget[], transactions: Transaction[]): Budget[] {
  return budgets.map((b) => {
    const monthPrefix = b.month.slice(0, 7); // "YYYY-MM"
    const spent = transactions
      .filter(
        (t) => t.amount < 0 && t.category === b.category && t.date.slice(0, 7) === monthPrefix
      )
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    return { ...b, spent };
  });
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? parseLocalDate(date) : date;
  return d.toLocaleDateString("en-NP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Parses a "YYYY-MM-DD" string into a Date in the *local* timezone.
 * `new Date("2026-06-01")` parses as UTC midnight, which can roll back a day
 * in negative-offset zones; building from components keeps the intended day.
 */
export function parseLocalDate(date: string): Date {
  const [y, m, d] = date.slice(0, 10).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** First day of the current month as "YYYY-MM-01" (matches the budgets.month column). */
export function currentMonthStart(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

/** Current month as a "YYYY-MM" prefix, for string-based date comparisons. */
export function currentMonthPrefix(): string {
  return currentMonthStart().slice(0, 7);
}