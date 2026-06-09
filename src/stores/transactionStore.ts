import { create } from "zustand";
import { Transaction } from "@/types";

interface TransactionStore {
  transactions: Transaction[];
  loading: boolean;
  setTransactions: (transactions: Transaction[]) => void;
  setLoading: (loading: boolean) => void;
  addTransaction: (transaction: Transaction) => void;
  removeTransaction: (id: string) => void;
}

export const useTransactionStore = create<TransactionStore>((set) => ({
  transactions: [],
  loading: false,
  setTransactions: (transactions) => set({ transactions }),
  setLoading: (loading) => set({ loading }),
  addTransaction: (transaction) =>
    set((state) => ({ transactions: [transaction, ...state.transactions] })),
  removeTransaction: (id) =>
    set((state) => ({ transactions: state.transactions.filter((t) => t.id !== id) })),
}));