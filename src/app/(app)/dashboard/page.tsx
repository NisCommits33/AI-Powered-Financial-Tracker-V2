"use client";

import { useEffect, useMemo } from "react";
import { ArrowUpRight, ArrowDownRight, TrendingUp, PiggyBank, ArrowRight } from "lucide-react";
import { useAccounts } from "@/hooks/useAccounts";
import { useBudgets } from "@/hooks/useBudgets";
import { useTransactions } from "@/hooks/useTransactions";
import { formatNPR } from "@/lib/utils";

export default function DashboardPage() {
  const { accounts, fetchAccounts } = useAccounts();
  const { budgets, fetchBudgets } = useBudgets();
  const { transactions, fetchTransactions } = useTransactions();

  useEffect(() => {
    fetchAccounts();
    fetchBudgets();
    fetchTransactions();
  }, []);

  // Calculate metrics
  const netWorth = useMemo(() => {
    return accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
  }, [accounts]);

  const thisMonthTransactions = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    return transactions.filter((t) => {
      const tDate = new Date(t.date);
      return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
    });
  }, [transactions]);

  const income = useMemo(() => {
    return thisMonthTransactions
      .filter((t) => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);
  }, [thisMonthTransactions]);

  const expenses = useMemo(() => {
    return thisMonthTransactions
      .filter((t) => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  }, [thisMonthTransactions]);

  // Get top budgets
  const topBudgets = useMemo(() => {
    return budgets.slice(0, 2);
  }, [budgets]);

  return (
    <div className="flex flex-col gap-6 w-full text-zinc-950 dark:text-zinc-50 pb-8">
      {/* Header */}
      <header className="flex justify-between items-center py-4">
        <div>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 tracking-wider uppercase">Dashboard</p>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 dark:text-white">Welcome back</h1>
        </div>
        <div className="w-12 h-12 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-lg shadow-md">
          {accounts.length > 0 ? accounts[0].name?.charAt(0).toUpperCase() : "U"}
        </div>
      </header>

      {/* Grid container for desktop/tablet responsiveness */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
        {/* Left Panel - Net Worth & Accounts */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Net Worth Card */}
          <section className="glass-card p-8 rounded-xl flex flex-col gap-6 relative overflow-hidden">
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 tracking-wider uppercase mb-2">Total Net Worth</p>
              <h2 className="text-5xl font-black tracking-tight text-gray-900 dark:text-white">{formatNPR(netWorth)}</h2>
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                  <ArrowDownRight className="w-5 h-5 rotate-180" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase">Income</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{formatNPR(income)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase">Expenses</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{formatNPR(expenses)}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Active Accounts Segment */}
          <section className="flex flex-col gap-4">
            <h3 className="text-xs font-bold tracking-wider text-gray-500 dark:text-gray-400 uppercase">My Accounts</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {accounts.length > 0 ? (
                accounts.map((account) => (
                  <div
                    key={account.id}
                    className="glass-card p-4 rounded-lg flex flex-col justify-between h-28 hover:shadow-md transition-all duration-200"
                  >
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">{account.name}</span>
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">{formatNPR(account.balance)}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No accounts yet</p>
              )}
            </div>
          </section>
        </div>

        {/* Right Panel - Budgets & Insights */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Monthly Budget Summary */}
          <section className="glass-card p-8 rounded-xl flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold tracking-wider text-gray-500 dark:text-gray-400 uppercase">Monthly Budget</h3>
              <PiggyBank className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>

            <div className="flex flex-col gap-4">
              {topBudgets.length > 0 ? (
                topBudgets.map((budget) => {
                  const percentage = Math.min((budget.spent / budget.monthly_limit) * 100, 100);
                  return (
                    <div key={budget.id}>
                      <div className="flex justify-between text-xs font-semibold mb-2 text-gray-900 dark:text-gray-100">
                        <span>{budget.category}</span>
                        <span className={percentage > 80 ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400"}>
                          {Math.round(percentage)}%
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            percentage > 80 ? "bg-red-600 dark:bg-red-500" : "bg-blue-600 dark:bg-blue-500"
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No budgets set</p>
              )}
            </div>
          </section>

          {/* AI Insights Segment */}
          <section className="glass-card p-6 rounded-3xl flex flex-col gap-3 border border-white/20 dark:border-white/5">
            <h3 className="text-xs font-bold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase">AI Spending Insights</h3>
            <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              {expenses > income
                ? `Your expenses (${formatNPR(expenses)}) exceed income (${formatNPR(income)}) this month. Review your spending patterns to stay within budget.`
                : `Great job! Your income (${formatNPR(income)}) covers your expenses (${formatNPR(expenses)}) with ${formatNPR(income - expenses)} remaining.`}
            </p>
            <div className="flex items-center gap-1 text-[11px] font-bold text-primary cursor-pointer hover:underline pt-1">
              <span>View all insights</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
