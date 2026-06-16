import { useGoalStore } from "@/stores/goalStore";
import { createClientComponentClient } from "@/lib/supabase/client";
import { Goal } from "@/types";

export function useGoals() {
  const supabase = createClientComponentClient();
  const { goals, loading, setGoals, setLoading, addGoal, updateGoal, removeGoal } =
    useGoalStore();

  const fetchGoals = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("goals")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setGoals(data);
    setLoading(false);
  };

  const createGoal = async (goal: Omit<Goal, "id" | "created_at" | "is_completed" | "current_amount"> & { current_amount?: number }) => {
    const { data, error } = await supabase
      .from("goals")
      .insert({ ...goal, current_amount: goal.current_amount ?? 0 })
      .select()
      .single();
    if (!error && data) addGoal(data);
    return { data, error };
  };

  const updateGoalEntry = async (id: string, updates: Partial<Goal>) => {
    const { error } = await supabase.from("goals").update(updates).eq("id", id);
    if (!error) updateGoal(id, updates);
    return { error };
  };

  const contributeToGoal = async (id: string, amount: number) => {
    const local = goals.find((g) => g.id === id);
    let current: Goal;
    if (local) {
      current = local;
    } else {
      const { data } = await supabase.from("goals").select("*").eq("id", id).single();
      if (!data) return { error: { message: "Goal not found" } };
      current = data;
    }
    const newAmount = Math.max(0, current.current_amount + amount);
    const is_completed = newAmount >= current.target_amount;
    return updateGoalEntry(id, { current_amount: newAmount, is_completed });
  };

  const deleteGoal = async (id: string) => {
    const { error } = await supabase.from("goals").delete().eq("id", id);
    if (!error) removeGoal(id);
    return { error };
  };

  return {
    goals,
    loading,
    fetchGoals,
    createGoal,
    updateGoalEntry,
    contributeToGoal,
    deleteGoal,
  };
}
