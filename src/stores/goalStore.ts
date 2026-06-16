import { create } from "zustand";
import { Goal } from "@/types";

interface GoalStore {
  goals: Goal[];
  loading: boolean;
  setGoals: (goals: Goal[]) => void;
  setLoading: (loading: boolean) => void;
  addGoal: (goal: Goal) => void;
  updateGoal: (id: string, goal: Partial<Goal>) => void;
  removeGoal: (id: string) => void;
}

export const useGoalStore = create<GoalStore>((set) => ({
  goals: [],
  loading: false,
  setGoals: (goals) => set({ goals }),
  setLoading: (loading) => set({ loading }),
  addGoal: (goal) => set((state) => ({ goals: [goal, ...state.goals] })),
  updateGoal: (id, updates) =>
    set((state) => ({
      goals: state.goals.map((g) => (g.id === id ? { ...g, ...updates } : g)),
    })),
  removeGoal: (id) =>
    set((state) => ({ goals: state.goals.filter((g) => g.id !== id) })),
}));
