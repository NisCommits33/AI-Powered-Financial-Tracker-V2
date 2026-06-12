"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowDownRight,
  PiggyBank,
  ArrowRight,
  Sparkles,
  Plus,
  Send,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from "recharts";
import { useAccounts } from "@/hooks/useAccounts";
import { useBudgets } from "@/hooks/useBudgets";
import { useTransactions } from "@/hooks/useTransactions";
import { formatNPR, withComputedSpent, parseLocalDate } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";
import { useDashboardStore } from "@/stores/dashboardStore";

const CATEGORY_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

export default function DashboardPage() {
  const { accounts, fetchAccounts } = useAccounts();
  const { budgets, fetchBudgets } = useBudgets();
  const { transactions, fetchTransactions } = useTransactions();
  const { openNLModal } = useUIStore();
  const { enabledCharts } = useDashboardStore();

  useEffect(() => {
    fetchAccounts();
    fetchBudgets();
    fetchTransactions();
  }, []);

  const netWorth = useMemo(() => {
    return accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
  }, [accounts]);

  const thisMonthTransactions = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return transactions.filter((t) => {
      const tDate = parseLocalDate(t.date);
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

  const savingsRate = useMemo(() => {
    if (income <= 0) return 0;
    return Math.round(((income - expenses) / income) * 100);
  }, [income, expenses]);

  const topBudgets = useMemo(() => budgets.slice(0, 3), [budgets]);

  // Cashflow: last 6 months income vs expense
  const cashflowData = useMemo(() => {
    const months: { key: string; label: string; income: number; expense: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleString("default", { month: "short" }),
        income: 0,
        expense: 0,
      });
    }
    transactions.forEach((t) => {
      const d = parseLocalDate(t.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const bucket = months.find((m) => m.key === key);
      if (!bucket) return;
      if (t.amount > 0) bucket.income += t.amount;
      else bucket.expense += Math.abs(t.amount);
    });
    return months;
  }, [transactions]);

  // Category breakdown for current month expenses
  const categoryData = useMemo(() => {
    const map = new Map<string, number>();
    thisMonthTransactions
      .filter((t) => t.amount < 0)
      .forEach((t) => {
        map.set(t.category, (map.get(t.category) || 0) + Math.abs(t.amount));
      });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [thisMonthTransactions]);

  const recentTransactions = useMemo(() => transactions.slice(0, 5), [transactions]);

  // Approximate net worth trend: walk monthly net cashflow backwards from the current balance
  const netWorthTrendData = useMemo(() => {
    const netByMonth = cashflowData.map((m) => m.income - m.expense);
    const totalNet = netByMonth.reduce((sum, n) => sum + n, 0);
    let running = netWorth - totalNet;
    return cashflowData.map((m, i) => {
      running += netByMonth[i];
      return { label: m.label, value: running };
    });
  }, [cashflowData, netWorth]);

  // Account balance distribution
  const accountDistributionData = useMemo(() => {
    return accounts
      .filter((a) => a.balance > 0)
      .map((a) => ({ name: a.name, value: a.balance }))
      .sort((a, b) => b.value - a.value);
  }, [accounts]);

  // Budget usage percentages (spent is recalculated from actual transactions)
  const budgetUsageData = useMemo(() => {
    return withComputedSpent(budgets, transactions).map((b) => ({
      category: b.category,
      percentage: b.monthly_limit > 0 ? Math.min((b.spent / b.monthly_limit) * 100, 100) : 0,
    }));
  }, [budgets, transactions]);

  // Daily spending trend for the current month
  const dailySpendingData = useMemo(() => {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, amount: 0 }));
    thisMonthTransactions
      .filter((t) => t.amount < 0)
      .forEach((t) => {
        const d = parseLocalDate(t.date).getDate();
        days[d - 1].amount += Math.abs(t.amount);
      });
    return days;
  }, [thisMonthTransactions]);

  // Income vs expense ratio gauge (% of income spent)
  const incomeExpenseRatioData = useMemo(() => {
    const ratio = income > 0 ? Math.min((expenses / income) * 100, 100) : expenses > 0 ? 100 : 0;
    return [{ name: "ratio", value: ratio, fill: ratio > 90 ? "var(--destructive)" : "var(--chart-1)" }];
  }, [income, expenses]);

  // Top merchants/descriptions by spend this month
  const topMerchantsData = useMemo(() => {
    const map = new Map<string, number>();
    thisMonthTransactions
      .filter((t) => t.amount < 0)
      .forEach((t) => {
        const key = t.description || t.category;
        map.set(key, (map.get(key) || 0) + Math.abs(t.amount));
      });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [thisMonthTransactions]);

  // Year-over-year: this month vs same month last year
  const yearOverYearData = useMemo(() => {
    const now = new Date();
    const buildTotals = (year: number) => {
      let inc = 0;
      let exp = 0;
      transactions.forEach((t) => {
        const d = parseLocalDate(t.date);
        if (d.getFullYear() === year && d.getMonth() === now.getMonth()) {
          if (t.amount > 0) inc += t.amount;
          else exp += Math.abs(t.amount);
        }
      });
      return { income: inc, expense: exp };
    };
    const thisYear = buildTotals(now.getFullYear());
    const lastYear = buildTotals(now.getFullYear() - 1);
    const monthLabel = now.toLocaleString("default", { month: "short" });
    return [
      { label: `${monthLabel} ${now.getFullYear() - 1}`, ...lastYear },
      { label: `${monthLabel} ${now.getFullYear()}`, ...thisYear },
    ];
  }, [transactions]);

  // Spending by weekday
  const weeklyHeatmapData = useMemo(() => {
    const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const totals = labels.map((label) => ({ label, value: 0 }));
    thisMonthTransactions
      .filter((t) => t.amount < 0)
      .forEach((t) => {
        const day = parseLocalDate(t.date).getDay();
        totals[day].value += Math.abs(t.amount);
      });
    return totals;
  }, [thisMonthTransactions]);

  // Recurring vs one-time spend (based on "recurring" tag)
  const recurringVsOneTimeData = useMemo(() => {
    let recurring = 0;
    let oneTime = 0;
    thisMonthTransactions
      .filter((t) => t.amount < 0)
      .forEach((t) => {
        if (t.tags?.includes("recurring")) recurring += Math.abs(t.amount);
        else oneTime += Math.abs(t.amount);
      });
    return [
      { name: "Recurring", value: recurring },
      { name: "One-Time", value: oneTime },
    ];
  }, [thisMonthTransactions]);

  // Savings goal progress (20% of income target)
  const savingsGoalProgressData = useMemo(() => {
    const target = 20;
    const progress = Math.max(0, Math.min((savingsRate / target) * 100, 100));
    return [{ name: "progress", value: progress, fill: savingsRate >= target ? "var(--chart-1)" : "var(--chart-3)" }];
  }, [savingsRate]);

  return (
    <div className="flex flex-col gap-4 w-full text-foreground pb-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        {/* Total Balance hero */}
        <section className="sm:col-span-2 lg:col-span-2 lg:row-span-2 bg-primary text-primary-foreground rounded-2xl p-8 flex flex-col justify-between gap-6 relative overflow-hidden">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider opacity-80 mb-2">Total Balance</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">{formatNPR(netWorth)}</h2>
          </div>
          <div className="flex gap-3">
            <button
              onClick={openNLModal}
              className="flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-5 py-2.5 text-sm font-semibold transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Transaction
            </button>
            <Link
              href="/transactions"
              className="flex items-center gap-2 rounded-xl bg-white/95 text-primary px-5 py-2.5 text-sm font-semibold hover:bg-white transition-colors"
            >
              <Send className="w-4 h-4" />
              View All
            </Link>
          </div>
        </section>

        {/* Income tile */}
        <section className="glass-card p-6 flex flex-col justify-between gap-4">
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-accent-foreground">
            <ArrowDownRight className="w-5 h-5 rotate-180" />
          </div>
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">This Month Income</p>
            <p className="text-2xl font-bold text-foreground">{formatNPR(income)}</p>
          </div>
        </section>

        {/* Expenses tile */}
        <section className="glass-card p-6 flex flex-col justify-between gap-4">
          <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center text-destructive">
            <ArrowUpRight className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">This Month Expenses</p>
            <p className="text-2xl font-bold text-foreground">{formatNPR(expenses)}</p>
          </div>
        </section>

        {/* Savings rate tile */}
        <section className="glass-card p-6 flex flex-col justify-between gap-4">
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-accent-foreground">
            <PiggyBank className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Savings Rate</p>
            <p className="text-2xl font-bold text-foreground">{savingsRate}%</p>
          </div>
        </section>

        {/* Monthly Budget Summary */}
        <section className="glass-card p-6 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Monthly Budget</h3>
            <PiggyBank className="w-5 h-5 text-primary" />
          </div>

          <div className="flex flex-col gap-4">
            {topBudgets.length > 0 ? (
              topBudgets.map((budget) => {
                const percentage = Math.min((budget.spent / budget.monthly_limit) * 100, 100);
                return (
                  <div key={budget.id}>
                    <div className="flex justify-between text-xs font-semibold mb-2 text-foreground">
                      <span>{budget.category}</span>
                      <span className={percentage > 80 ? "text-destructive" : "text-primary"}>
                        {Math.round(percentage)}%
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          percentage > 80 ? "bg-destructive" : "bg-primary"
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">No budgets set</p>
            )}
          </div>
        </section>

        {/* Cashflow Chart */}
        {enabledCharts.includes("cashflow") && (
          <section className="sm:col-span-2 lg:col-span-2 glass-card p-6 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Cashflow</h3>
              <span className="text-xs font-semibold text-muted-foreground">Last 6 months</span>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cashflowData} barGap={4}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} fontSize={12} stroke="var(--muted-foreground)" />
                  <YAxis axisLine={false} tickLine={false} fontSize={12} stroke="var(--muted-foreground)" width={40} />
                  <Tooltip
                    contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
                    formatter={(value) => formatNPR(Number(value))}
                  />
                  <Bar dataKey="income" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* Net Worth Trend Chart */}
        {enabledCharts.includes("netWorthTrend") && (
          <section className="sm:col-span-2 lg:col-span-2 glass-card p-6 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Net Worth Trend</h3>
              <span className="text-xs font-semibold text-muted-foreground">Last 6 months</span>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={netWorthTrendData}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} fontSize={12} stroke="var(--muted-foreground)" />
                  <YAxis axisLine={false} tickLine={false} fontSize={12} stroke="var(--muted-foreground)" width={50} />
                  <Tooltip
                    contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
                    formatter={(value) => formatNPR(Number(value))}
                  />
                  <Line type="monotone" dataKey="value" stroke="var(--chart-1)" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* Budget Usage Chart */}
        {enabledCharts.includes("budgetUsage") && (
          <section className="sm:col-span-2 lg:col-span-2 glass-card p-6 flex flex-col gap-4">
            <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Budget Usage</h3>
            {budgetUsageData.length > 0 ? (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={budgetUsageData} layout="vertical" margin={{ left: 8 }}>
                    <CartesianGrid horizontal={false} stroke="var(--border)" />
                    <XAxis type="number" domain={[0, 100]} axisLine={false} tickLine={false} fontSize={12} stroke="var(--muted-foreground)" unit="%" />
                    <YAxis type="category" dataKey="category" axisLine={false} tickLine={false} fontSize={12} stroke="var(--muted-foreground)" width={80} />
                    <Tooltip
                      contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
                      formatter={(value) => `${Math.round(Number(value))}%`}
                    />
                    <Bar dataKey="percentage" radius={[0, 4, 4, 0]}>
                      {budgetUsageData.map((b, i) => (
                        <Cell key={i} fill={b.percentage > 80 ? "var(--destructive)" : "var(--chart-1)"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No budgets set</p>
            )}
          </section>
        )}

        {/* Account Distribution Chart */}
        {enabledCharts.includes("accountDistribution") && (
          <section className="sm:col-span-2 lg:col-span-2 glass-card p-6 flex flex-col gap-4">
            <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Account Distribution</h3>
            {accountDistributionData.length > 0 ? (
              <div className="flex items-center gap-4">
                <div className="h-40 w-40 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={accountDistributionData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={2}
                      >
                        {accountDistributionData.map((_, i) => (
                          <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
                        formatter={(value) => formatNPR(Number(value))}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-2 flex-1">
                  {accountDistributionData.map((a, i) => (
                    <div key={a.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                        />
                        <span className="text-foreground font-medium truncate">{a.name}</span>
                      </div>
                      <span className="text-muted-foreground font-semibold">{formatNPR(a.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No account balances yet</p>
            )}
          </section>
        )}

        {/* Daily Spending Trend */}
        {enabledCharts.includes("dailySpending") && (
          <section className="sm:col-span-2 lg:col-span-2 glass-card p-6 flex flex-col gap-4">
            <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Daily Spending Trend</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailySpendingData}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} fontSize={12} stroke="var(--muted-foreground)" interval={4} />
                  <YAxis axisLine={false} tickLine={false} fontSize={12} stroke="var(--muted-foreground)" width={40} />
                  <Tooltip
                    contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
                    formatter={(value) => formatNPR(Number(value))}
                    labelFormatter={(label) => `Day ${label}`}
                  />
                  <Area type="monotone" dataKey="amount" stroke="var(--chart-2)" fill="var(--chart-2)" fillOpacity={0.15} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* Income vs Expense Ratio gauge */}
        {enabledCharts.includes("incomeExpenseRatio") && (
          <section className="glass-card p-6 flex flex-col gap-4 items-center">
            <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase self-start">Income vs Expense</h3>
            <div className="h-40 w-40 relative">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart data={incomeExpenseRatioData} startAngle={90} endAngle={-270} innerRadius="70%" outerRadius="100%">
                  <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                  <RadialBar dataKey="value" background={{ fill: "var(--muted)" }} cornerRadius={8} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-foreground">{Math.round(incomeExpenseRatioData[0].value)}%</span>
                <span className="text-xs text-muted-foreground">of income spent</span>
              </div>
            </div>
          </section>
        )}

        {/* Top Merchants */}
        {enabledCharts.includes("topMerchants") && (
          <section className="sm:col-span-2 lg:col-span-2 glass-card p-6 flex flex-col gap-4">
            <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Top Merchants</h3>
            {topMerchantsData.length > 0 ? (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topMerchantsData} layout="vertical" margin={{ left: 8 }}>
                    <CartesianGrid horizontal={false} stroke="var(--border)" />
                    <XAxis type="number" axisLine={false} tickLine={false} fontSize={12} stroke="var(--muted-foreground)" />
                    <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} fontSize={12} stroke="var(--muted-foreground)" width={100} />
                    <Tooltip
                      contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
                      formatter={(value) => formatNPR(Number(value))}
                    />
                    <Bar dataKey="value" fill="var(--chart-3)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No spending data for this month yet</p>
            )}
          </section>
        )}

        {/* Year-over-Year */}
        {enabledCharts.includes("yearOverYear") && (
          <section className="sm:col-span-2 lg:col-span-2 glass-card p-6 flex flex-col gap-4">
            <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Year-over-Year</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={yearOverYearData} barGap={4}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} fontSize={12} stroke="var(--muted-foreground)" />
                  <YAxis axisLine={false} tickLine={false} fontSize={12} stroke="var(--muted-foreground)" width={40} />
                  <Tooltip
                    contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
                    formatter={(value) => formatNPR(Number(value))}
                  />
                  <Bar dataKey="income" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* Spending by Weekday */}
        {enabledCharts.includes("weeklyHeatmap") && (
          <section className="sm:col-span-2 lg:col-span-2 glass-card p-6 flex flex-col gap-4">
            <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Spending by Weekday</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyHeatmapData}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} fontSize={12} stroke="var(--muted-foreground)" />
                  <YAxis axisLine={false} tickLine={false} fontSize={12} stroke="var(--muted-foreground)" width={40} />
                  <Tooltip
                    contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
                    formatter={(value) => formatNPR(Number(value))}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {weeklyHeatmapData.map((_, i) => (
                      <Cell key={i} fill="var(--chart-4)" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* Recurring vs One-Time */}
        {enabledCharts.includes("recurringVsOneTime") && (
          <section className="glass-card p-6 flex flex-col gap-4">
            <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Recurring vs One-Time</h3>
            {recurringVsOneTimeData[0].value + recurringVsOneTimeData[1].value > 0 ? (
              <div className="flex items-center gap-4">
                <div className="h-32 w-32 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={recurringVsOneTimeData} dataKey="value" nameKey="name" innerRadius={35} outerRadius={55} paddingAngle={2}>
                        {recurringVsOneTimeData.map((_, i) => (
                          <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
                        formatter={(value) => formatNPR(Number(value))}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-2 flex-1">
                  {recurringVsOneTimeData.map((d, i) => (
                    <div key={d.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                        <span className="text-foreground font-medium">{d.name}</span>
                      </div>
                      <span className="text-muted-foreground font-semibold">{formatNPR(d.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No spending data for this month yet</p>
            )}
          </section>
        )}

        {/* Savings Goal Progress */}
        {enabledCharts.includes("savingsGoalProgress") && (
          <section className="glass-card p-6 flex flex-col gap-4 items-center">
            <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase self-start">Savings Goal</h3>
            <div className="h-40 w-40 relative">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart data={savingsGoalProgressData} startAngle={90} endAngle={-270} innerRadius="70%" outerRadius="100%">
                  <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                  <RadialBar dataKey="value" background={{ fill: "var(--muted)" }} cornerRadius={8} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-foreground">{savingsRate}%</span>
                <span className="text-xs text-muted-foreground">of 20% target</span>
              </div>
            </div>
          </section>
        )}

        {/* AI Insights */}
        <section className="sm:col-span-2 lg:col-span-2 glass-card p-6 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center text-accent-foreground">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">AI Spending Insights</h3>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {expenses > income
              ? `Your expenses (${formatNPR(expenses)}) exceed income (${formatNPR(income)}) this month. Review your spending patterns to stay within budget.`
              : `Great job! Your income (${formatNPR(income)}) covers your expenses (${formatNPR(expenses)}) with ${formatNPR(income - expenses)} remaining.`}
          </p>
          <Link href="/chat" className="flex items-center gap-1 text-xs font-bold text-primary hover:underline pt-1">
            <span>Ask the AI assistant</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </section>

        {/* Recent Transactions table */}
        <section className="sm:col-span-2 lg:col-span-2 glass-card p-6 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Recent Transactions</h3>
            <Link href="/transactions" className="text-xs font-bold text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="flex flex-col">
            {recentTransactions.length > 0 ? (
              recentTransactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-foreground">{t.description || t.category}</span>
                    <span className="text-xs text-muted-foreground">{t.category} &middot; {parseLocalDate(t.date).toLocaleDateString()}</span>
                  </div>
                  <span className={`text-sm font-bold ${t.amount > 0 ? "text-primary" : "text-foreground"}`}>
                    {t.amount > 0 ? "+" : ""}{formatNPR(t.amount)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No transactions yet</p>
            )}
          </div>
        </section>

        {/* Category breakdown donut */}
        {enabledCharts.includes("category") && (
        <section className="sm:col-span-2 lg:col-span-2 glass-card p-6 flex flex-col gap-4">
          <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Spending by Category</h3>
          {categoryData.length > 0 ? (
            <div className="flex items-center gap-4">
              <div className="h-40 w-40 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={2}
                    >
                      {categoryData.map((_, i) => (
                        <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
                      formatter={(value) => formatNPR(Number(value))}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-2 flex-1">
                {categoryData.map((c, i) => (
                  <div key={c.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                      />
                      <span className="text-foreground font-medium">{c.name}</span>
                    </div>
                    <span className="text-muted-foreground font-semibold">{formatNPR(c.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No spending data for this month yet</p>
          )}
        </section>
        )}
      </div>
    </div>
  );
}
