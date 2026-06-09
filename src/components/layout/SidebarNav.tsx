"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  PiggyBank,
  MessageSquare,
  Sparkles,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";

const navItems = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { id: "transactions", label: "Transactions", href: "/transactions", icon: ArrowLeftRight },
  { id: "accounts", label: "Accounts", href: "/accounts", icon: Wallet },
  { id: "budgets", label: "Budgets", href: "/budgets", icon: PiggyBank },
  { id: "chat", label: "Grok Chat", href: "/chat", icon: MessageSquare },
];

export default function SidebarNav() {
  const pathname = usePathname();
  const { openNLModal } = useUIStore();
  const currentTab = navItems.find((item) => pathname.startsWith(item.href))?.id || "dashboard";

  return (
    <aside className="fixed left-6 top-6 bottom-6 w-64 glass-card p-6 hidden md:flex flex-col justify-between rounded-xl">
      <div className="flex flex-col gap-8">
        {/* App Logo/Header */}
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
            F
          </div>
          <div>
            <h1 className="font-black text-xl tracking-tight text-gray-900 dark:text-white">
              FinWise
            </h1>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold">finance tracker</p>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex flex-col gap-1.5 relative">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  "relative flex items-center gap-3.5 px-4 py-2.5 rounded-lg select-none outline-none transition-all duration-200 text-sm font-medium",
                  isActive ? "text-white bg-blue-600" : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800/50"
                )}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Quick Transaction Action in Sidebar Footer */}
      <div className="flex flex-col gap-4">
        <motion.button
          onClick={openNLModal}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-200 outline-none"
        >
          <Plus className="w-4 h-4" />
          <span>Add Transaction</span>
        </motion.button>
      </div>
    </aside>
  );
}
