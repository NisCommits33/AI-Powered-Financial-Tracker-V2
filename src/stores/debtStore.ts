import { create } from "zustand";
import { Debt } from "@/types";

interface DebtStore {
  debts: Debt[];
  loading: boolean;
  setDebts: (debts: Debt[]) => void;
  setLoading: (loading: boolean) => void;
  addDebt: (debt: Debt) => void;
  updateDebt: (id: string, debt: Partial<Debt>) => void;
  removeDebt: (id: string) => void;
}

export const useDebtStore = create<DebtStore>((set) => ({
  debts: [],
  loading: false,
  setDebts: (debts) => set({ debts }),
  setLoading: (loading) => set({ loading }),
  addDebt: (debt) => set((state) => ({ debts: [debt, ...state.debts] })),
  updateDebt: (id, updates) =>
    set((state) => ({
      debts: state.debts.map((d) => (d.id === id ? { ...d, ...updates } : d)),
    })),
  removeDebt: (id) =>
    set((state) => ({ debts: state.debts.filter((d) => d.id !== id) })),
}));
