"use client";

import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatNPR } from "@/lib/utils";

const CATEGORY_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

export interface ChatChartPayload {
  chart_type: "category_breakdown" | "spending_trend";
  title: string;
  data: { name?: string; value?: number; month?: string; income?: number; expenses?: number }[];
}

export function ChatChart({ chart }: { chart: ChatChartPayload }) {
  if (!chart.data || chart.data.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 max-w-[80%]">
        <p className="text-sm font-semibold text-foreground mb-1">{chart.title}</p>
        <p className="text-sm text-muted-foreground">No data to show yet.</p>
      </div>
    );
  }

  if (chart.chart_type === "category_breakdown") {
    return (
      <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-4 max-w-[80%]">
        <div className="h-32 w-32 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={chart.data} dataKey="value" nameKey="name" innerRadius={35} outerRadius={55} paddingAngle={2}>
                {chart.data.map((_, i) => (
                  <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => formatNPR(Number(v))} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground mb-1">{chart.title}</p>
          {chart.data.map((d, i) => (
            <div key={d.name} className="flex items-center justify-between text-xs gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                <span className="text-muted-foreground truncate">{d.name}</span>
              </div>
              <span className="text-foreground font-medium shrink-0">{formatNPR(d.value || 0)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 max-w-[80%]">
      <p className="text-sm font-semibold text-foreground mb-2">{chart.title}</p>
      <div className="h-48 w-full min-w-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chart.data}>
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} width={40} />
            <Tooltip formatter={(v) => formatNPR(Number(v))} />
            <Bar dataKey="income" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expenses" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
