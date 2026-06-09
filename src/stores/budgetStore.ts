import { create } from "zustand";
import { Budget } from "@/types";

interface BudgetStore {
  budgets: Budget[];
  loading: boolean;
  setBudgets: (budgets: Budget[]) => void;
  setLoading: (loading: boolean) => void;
  addBudget: (budget: Budget) => void;
  updateBudget: (id: string, budget: Partial<Budget>) => void;
  removeBudget: (id: string) => void;
}

export const useBudgetStore = create<BudgetStore>((set) => ({
  budgets: [],
  loading: false,
  setBudgets: (budgets) => set({ budgets }),
  setLoading: (loading) => set({ loading }),
  addBudget: (budget) =>
    set((state) => ({ budgets: [budget, ...state.budgets] })),
  updateBudget: (id, updates) =>
    set((state) => ({
      budgets: state.budgets.map((b) =>
        b.id === id ? { ...b, ...updates } : b
      ),
    })),
  removeBudget: (id) =>
    set((state) => ({ budgets: state.budgets.filter((b) => b.id !== id) })),
}));
