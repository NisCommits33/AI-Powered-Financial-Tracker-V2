"use client";

import { motion } from "motion/react";
import { Plus } from "lucide-react";
import { usePathname } from "next/navigation";
import { useUIStore } from "@/stores/uiStore";

export default function FloatingAddButton() {
  const { openNLModal } = useUIStore();
  const pathname = usePathname();

  // The chat composer uses the same bottom-right space on mobile. Keeping the
  // global quick-add button here puts it above the send button and steals taps.
  if (pathname.startsWith("/chat")) return null;

  return (
    <div className="fixed bottom-24 right-6 z-50 md:hidden">
      <motion.button
        onClick={openNLModal}
        whileHover={{ scale: 1.08, y: -2 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 15 }}
        className="flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:shadow-xl transition-shadow duration-200 outline-none"
        aria-label="Add Transaction"
        title="Add transaction"
      >
        <Plus className="w-6 h-6 stroke-[2.5]" />
      </motion.button>
    </div>
  );
}
