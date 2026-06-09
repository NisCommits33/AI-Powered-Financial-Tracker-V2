import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIStore {
  isNLModalOpen: boolean;
  openNLModal: () => void;
  closeNLModal: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      isNLModalOpen: false,
      openNLModal: () => set({ isNLModalOpen: true }),
      closeNLModal: () => set({ isNLModalOpen: false }),
      activeTab: "dashboard",
      setActiveTab: (tab) => set({ activeTab: tab }),
    }),
    {
      name: "finwise-ui",
    }
  )
);
