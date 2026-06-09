"use client";

import { motion } from "motion/react";
import { Plus } from "lucide-react";
import { useUIStore } from "@/stores/uiStore";

export default function FloatingAddButton() {
  const { openNLModal } = useUIStore();

  return (
    <div className="fixed bottom-24 right-6 z-50 md:hidden">
      <motion.button
        onClick={openNLModal}
        whileHover={{ scale: 1.08, y: -2 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 15 }}
        className="flex items-center justify-center w-14 h-14 rounded-2xl glass-card text-primary shadow-lg hover:shadow-xl transition-shadow duration-200 outline-none border border-white/20 dark:border-white/10"
        aria-label="Add Transaction"
      >
        <Plus className="w-6 h-6 stroke-[2.5]" />
      </motion.button>
    </div>
  );
}
