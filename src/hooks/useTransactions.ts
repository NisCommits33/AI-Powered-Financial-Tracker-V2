import { useTransactionStore } from "@/stores/transactionStore";
import { createClientComponentClient } from "@/lib/supabase/client";
import { Transaction } from "@/types";

export function useTransactions() {
  const supabase = createClientComponentClient();
  const { transactions, loading, setTransactions, setLoading, addTransaction, removeTransaction } =
    useTransactionStore();

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

  const createTransaction = async (transaction: Omit<Transaction, "id" | "created_at">) => {
    const { data, error } = await supabase
      .from("transactions")
      .insert(transaction)
      .select()
      .single();
    if (!error && data) addTransaction(data);
    return { data, error };
  };

  const softDeleteTransaction = async (id: string) => {
    const { error } = await supabase
      .from("transactions")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (!error) removeTransaction(id);
    return { error };
  };

  return {
    transactions,
    loading,
    fetchTransactions,
    createTransaction,
    softDeleteTransaction,
  };
}