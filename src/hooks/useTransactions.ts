import { useTransactionStore } from "@/stores/transactionStore";
import { useAccountStore } from "@/stores/accountStore";
import { createClientComponentClient } from "@/lib/supabase/client";
import { Transaction } from "@/types";

export function useTransactions() {
  const supabase = createClientComponentClient();
  const { transactions, loading, setTransactions, setLoading, addTransaction, removeTransaction, updateTransaction } =
    useTransactionStore();
  const { updateAccount } = useAccountStore();

  const fetchTransactions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .is("deleted_at", null)
      .order("date", { ascending: false });
    if (!error && data) setTransactions(data);
    setLoading(false);
  };

  // Account balances are maintained in the database by a trigger on the
  // transactions table (migration: sync_account_balance). The client never
  // computes balances itself, which makes drift structurally impossible. After a
  // write we just re-read the affected account rows so the in-memory store
  // mirrors the DB's authoritative value.
  const refreshAccountBalances = async (...accountIds: (string | null | undefined)[]) => {
    const ids = [...new Set(accountIds.filter((id): id is string => !!id))];
    if (ids.length === 0) return;
    const { data } = await supabase.from("accounts").select("id, balance").in("id", ids);
    data?.forEach((a) => updateAccount(a.id, { balance: a.balance }));
  };

  const createTransaction = async (transaction: Omit<Transaction, "id" | "created_at">) => {
    if (!Number.isFinite(transaction.amount) || transaction.amount === 0) {
      return { data: null, error: { message: "Transaction amount must be a non-zero number." } };
    }
    if (!transaction.account_id) {
      return { data: null, error: { message: "Please select an account for this transaction." } };
    }

    const { data, error } = await supabase
      .from("transactions")
      .insert(transaction)
      .select()
      .single();
    if (!error && data) {
      addTransaction(data);
      await refreshAccountBalances(data.account_id);
    }
    return { data, error };
  };

  const updateTransactionEntry = async (id: string, updates: Partial<Omit<Transaction, "id" | "created_at">>) => {
    if (updates.amount !== undefined && (!Number.isFinite(updates.amount) || updates.amount === 0)) {
      return { error: { message: "Transaction amount must be a non-zero number." } };
    }

    const original = transactions.find((t) => t.id === id);
    const { error } = await supabase
      .from("transactions")
      .update(updates)
      .eq("id", id);
    if (!error) {
      updateTransaction(id, updates);
      // The trigger handles all balance math (including amount changes and
      // moving a transaction between accounts); we just refresh both the old and
      // new account so the store reflects the new balances.
      await refreshAccountBalances(original?.account_id, updates.account_id);
    }
    return { error };
  };

  const softDeleteTransaction = async (id: string) => {
    const original = transactions.find((t) => t.id === id);
    const { error } = await supabase
      .from("transactions")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (!error) {
      removeTransaction(id);
      await refreshAccountBalances(original?.account_id);
    }
    return { error };
  };

  return {
    transactions,
    loading,
    fetchTransactions,
    createTransaction,
    updateTransactionEntry,
    softDeleteTransaction,
  };
}
