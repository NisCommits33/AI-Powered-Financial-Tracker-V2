import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ChartId =
  | "cashflow"
  | "category"
  | "netWorthTrend"
  | "accountDistribution"
  | "budgetUsage"
  | "dailySpending"
  | "incomeExpenseRatio"
  | "topMerchants"
  | "yearOverYear"
  | "weeklyHeatmap"
  | "recurringVsOneTime"
  | "savingsGoalProgress";

interface DashboardStore {
  enabledCharts: ChartId[];
  toggleChart: (id: ChartId) => void;
  setEnabledCharts: (ids: ChartId[]) => void;
}

export const useDashboardStore = create<DashboardStore>()(
  persist(
    (set, get) => ({
      enabledCharts: ["cashflow", "category"],
      toggleChart: (id) => {
        const current = get().enabledCharts;
        set({
          enabledCharts: current.includes(id)
            ? current.filter((c) => c !== id)
            : [...current, id],
        });
      },
      setEnabledCharts: (ids) => set({ enabledCharts: ids }),
    }),
    {
      name: "finwise-dashboard",
    }
  )
);

export const chartDefs: { id: ChartId; label: string; description: string }[] = [
  { id: "cashflow", label: "Cashflow", description: "Monthly income vs expenses, last 6 months" },
  { id: "category", label: "Spending by Category", description: "Donut breakdown of this month's expenses" },
  { id: "netWorthTrend", label: "Net Worth Trend", description: "Approximate net worth over the last 6 months" },
  { id: "accountDistribution", label: "Account Distribution", description: "Donut of balance share per account" },
  { id: "budgetUsage", label: "Budget Usage", description: "Bar chart of % used per budget category" },
  { id: "dailySpending", label: "Daily Spending Trend", description: "This month's daily expense total" },
  { id: "incomeExpenseRatio", label: "Income vs Expense Ratio", description: "Gauge of expenses against income this month" },
  { id: "topMerchants", label: "Top Merchants", description: "Top spending destinations by description" },
  { id: "yearOverYear", label: "Year-over-Year", description: "This month vs the same month last year" },
  { id: "weeklyHeatmap", label: "Spending by Weekday", description: "Spending intensity per day of the week" },
  { id: "recurringVsOneTime", label: "Recurring vs One-Time", description: "Split of recurring vs one-time spending" },
  { id: "savingsGoalProgress", label: "Savings Goal Progress", description: "Progress toward a 20% monthly savings target" },
];
