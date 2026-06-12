import { useBudgetStore } from "@/stores/budgetStore";
import { createClientComponentClient } from "@/lib/supabase/client";
import { currentMonthStart } from "@/lib/utils";
import { Budget } from "@/types";

export function useBudgets() {
  const supabase = createClientComponentClient();
  const { budgets, loading, setBudgets, setLoading, addBudget, updateBudget, removeBudget } =
    useBudgetStore();

  // Defaults to the current month so the budgets page / dashboard only ever show
  // the active month's budgets, not every budget ever created. Pass a "YYYY-MM-01"
  // string to load a specific month's budgets instead.
  const fetchBudgets = async (month: string = currentMonthStart()) => {
    setLoading(true);
    const { data } = await supabase
      .from("budgets")
      .select("*")
      .eq("month", month)
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
