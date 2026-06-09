"use client";

import { usePathname, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { LayoutDashboard, Receipt, Wallet, Target, MessageCircle } from "lucide-react";

const navItems = [
  { path: "/dashboard", icon: LayoutDashboard, label: "Home" },
  { path: "/transactions", icon: Receipt, label: "Txns" },
  { path: "/accounts", icon: Wallet, label: "Accounts" },
  { path: "/budgets", icon: Target, label: "Budgets" },
  { path: "/chat", icon: MessageCircle, label: "Chat" },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="md:hidden fixed bottom-4 left-0 right-0 flex justify-center z-50">
      <div className="capsule-nav flex items-center gap-1 px-2 py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className="relative flex flex-col items-center justify-center px-4 py-2 rounded-lg transition-all"
            >
              {isActive && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute inset-0 bg-blue-100 dark:bg-blue-900/30 rounded-lg"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <item.icon
                className={`h-5 w-5 relative z-10 ${isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-gray-500"
                  }`}
              />
              <span
                className={`text-[10px] mt-1 relative z-10 font-medium ${isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-gray-500"
                  }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}