"use client";

import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";

export default function ContentArea({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed } = useUIStore();

  return (
    <div
      className={cn(
        "flex-1 flex flex-col items-center w-full md:pt-6 transition-[padding] duration-300",
        sidebarCollapsed ? "md:pl-28" : "md:pl-72"
      )}
    >
      {children}
    </div>
  );
}
