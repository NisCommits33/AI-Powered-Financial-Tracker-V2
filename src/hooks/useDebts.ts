import { useDebtStore } from "@/stores/debtStore";
import { createClientComponentClient } from "@/lib/supabase/client";
import { Debt } from "@/types";

export function useDebts() {
  const supabase = createClientComponentClient();
  const { debts, loading, setDebts, setLoading, addDebt, updateDebt, removeDebt } =
    useDebtStore();

  const fetchDebts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("debts")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setDebts(data);
    setLoading(false);
  };

  const createDebt = async (
    debt: Omit<Debt, "id" | "created_at" | "is_settled" | "remaining_amount"> & { remaining_amount?: number }
  ) => {
    const { data, error } = await supabase
      .from("debts")
      .insert({ ...debt, remaining_amount: debt.remaining_amount ?? debt.principal_amount })
      .select()
      .single();
    if (!error && data) addDebt(data);
    return { data, error };
  };

  const updateDebtEntry = async (id: string, updates: Partial<Debt>) => {
    const { error } = await supabase.from("debts").update(updates).eq("id", id);
    if (!error) updateDebt(id, updates);
    return { error };
  };

  const recordPayment = async (id: string, amount: number) => {
    const local = debts.find((d) => d.id === id);
    let current: Debt;
    if (local) {
      current = local;
    } else {
      const { data } = await supabase.from("debts").select("*").eq("id", id).single();
      if (!data) return { error: { message: "Debt not found" } };
      current = data;
    }
    const newRemaining = Math.max(0, current.remaining_amount - amount);
    const is_settled = newRemaining <= 0;
    return updateDebtEntry(id, { remaining_amount: newRemaining, is_settled });
  };

  const deleteDebt = async (id: string) => {
    const { error } = await supabase.from("debts").delete().eq("id", id);
    if (!error) removeDebt(id);
    return { error };
  };

  return {
    debts,
    loading,
    fetchDebts,
    createDebt,
    updateDebtEntry,
    recordPayment,
    deleteDebt,
  };
}
