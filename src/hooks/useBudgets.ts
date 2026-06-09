import { useBudgetStore } from "@/stores/budgetStore";
import { createClientComponentClient } from "@/lib/supabase/client";
import { Budget } from "@/types";

export function useBudgets() {
  const supabase = createClientComponentClient();
  const { budgets, loading, setBudgets, setLoading, addBudget, updateBudget, removeBudget } =
    useBudgetStore();

  const fetchBudgets = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("budgets")
      .select("*")
      .order("category");
    if (data) setBudgets(data);
    setLoading(false);
  };

  const createBudget = async (budget: Omit<Budget, "id">) => {
    const { data, error } = await supabase
      .from("budgets")
      .insert(budget)
      .select()
      .single();
    if (!error && data) addBudget(data);
    return { data, error };
  };

  const updateBudgetEntry = async (id: string, updates: Partial<Budget>) => {
    const { error } = await supabase
      .from("budgets")
      .update(updates)
      .eq("id", id);
    if (!error) updateBudget(id, updates);
    return { error };
  };

  const deleteBudget = async (id: string) => {
    const { error } = await supabase.from("budgets").delete().eq("id", id);
    if (!error) removeBudget(id);
    return { error };
  };

  return {
    budgets,
    loading,
    fetchBudgets,
    createBudget,
    updateBudgetEntry,
    deleteBudget,
  };
}
