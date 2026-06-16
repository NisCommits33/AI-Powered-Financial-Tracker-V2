"use client";

import { useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import { Debt } from "@/types";
import { formatNPR } from "@/lib/utils";

interface DebtPayoffSimulatorProps {
  debt: Debt;
}

// Simple monthly-amortization projection: each month, interest accrues on the
// remaining balance, then the payment is applied. Stops once the balance
// reaches zero or after a 50-year cap (to avoid infinite loops on payments
// too small to cover the interest).
function projectPayoff(remaining: number, annualRatePct: number, monthlyPayment: number) {
  const monthlyRate = annualRatePct / 100 / 12;
  let balance = remaining;
  let months = 0;
  let totalInterest = 0;
  const maxMonths = 600;

  while (balance > 0 && months < maxMonths) {
    const interest = balance * monthlyRate;
    if (monthlyPayment <= interest && interest > 0) {
      // Payment can't even cover interest — balance never shrinks.
      return { months: null, totalInterest: null };
    }
    totalInterest += interest;
    balance = balance + interest - monthlyPayment;
    months += 1;
  }

  if (balance > 0) return { months: null, totalInterest: null };
  return { months, totalInterest };
}

export function DebtPayoffSimulator({ debt }: DebtPayoffSimulatorProps) {
  const [open, setOpen] = useState(false);

  const remaining = debt.remaining_amount;
  const rate = debt.interest_rate || 0;

  // Default slider to a payment that clears the debt in ~12 months.
  const defaultPayment = useMemo(() => {
    const monthlyRate = rate / 100 / 12;
    if (monthlyRate === 0) return Math.max(Math.ceil(remaining / 12), 1);
    // Standard amortization formula for a 12-month term.
    const payment = (remaining * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -12));
    return Math.max(Math.ceil(payment), 1);
  }, [remaining, rate]);

  const minPayment = Math.max(Math.ceil(remaining * (rate / 100 / 12)) + 1, 1);
  const maxPayment = Math.max(Math.ceil(remaining / 2), defaultPayment * 2, minPayment + 1);

  const [payment, setPayment] = useState(defaultPayment);

  const result = useMemo(
    () => projectPayoff(remaining, rate, payment),
    [remaining, rate, payment]
  );

  if (remaining <= 0) return null;

  return (
    <div className="border-t border-border pt-3 mt-1">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        <Calculator className="w-3.5 h-3.5" />
        {open ? "Hide payoff simulator" : "Simulate payoff"}
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs text-muted-foreground">Monthly payment</label>
            <span className="text-sm font-bold text-foreground tabular-nums">{formatNPR(payment)}</span>
          </div>
          <input
            type="range"
            min={minPayment}
            max={maxPayment}
            step={Math.max(Math.round((maxPayment - minPayment) / 100), 1)}
            value={payment}
            onChange={(e) => setPayment(Number(e.target.value))}
            className="w-full h-2 rounded-full appearance-none bg-muted accent-primary cursor-pointer"
          />

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Payoff time</p>
              <p className="text-lg font-bold text-foreground tabular-nums">
                {result.months !== null
                  ? result.months < 12
                    ? `${result.months} mo`
                    : `${Math.floor(result.months / 12)}y ${result.months % 12}mo`
                  : "Never"}
              </p>
            </div>
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                {rate > 0 ? "Total interest" : "Total paid"}
              </p>
              <p className="text-lg font-bold text-foreground tabular-nums">
                {result.totalInterest !== null
                  ? formatNPR(rate > 0 ? result.totalInterest : remaining)
                  : "—"}
              </p>
            </div>
          </div>

          {result.months === null && (
            <p className="text-xs text-destructive">
              This payment doesn&apos;t cover the monthly interest — increase it to make progress.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
