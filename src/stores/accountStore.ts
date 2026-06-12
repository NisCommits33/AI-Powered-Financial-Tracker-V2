import { create } from 'zustand';
import { Account } from '@/types';

interface AccountStore {
  accounts: Account[];
  loading: boolean;
  setAccounts: (accounts: Account[]) => void;
  setLoading: (loading: boolean) => void;
  addAccount: (account: Account) => void;
  removeAccount: (id: string) => void;
  updateAccount: (id: string, updates: Partial<Account>) => void;
}

export const useAccountStore = create<AccountStore>((set) => ({
  accounts: [],
  loading: false,
  setAccounts: (accounts) => set({ accounts }),
  setLoading: (loading) => set({ loading }),
  addAccount: (account) =>
    set((state) => ({ accounts: [account, ...state.accounts] })),
  removeAccount: (id) =>
    set((state) => ({ accounts: state.accounts.filter((a) => a.id !== id) })),
  updateAccount: (id, updates) =>
    set((state) => ({
      accounts: state.accounts.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    })),
}));
