import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UserStore {
  displayName: string;
  setDisplayName: (name: string) => void;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      displayName: "User",
      setDisplayName: (displayName) => set({ displayName: displayName.trim() || "User" }),
    }),
    {
      name: "finwise-user",
    }
  )
);
