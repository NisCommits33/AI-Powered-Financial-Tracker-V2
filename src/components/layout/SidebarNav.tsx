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
  Settings,
  User,
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

const secondaryNavItems = [
  { id: "settings", label: "Settings", href: "/settings", icon: Settings },
  { id: "profile", label: "Profile", href: "/profile", icon: User },
];

export default function SidebarNav() {
  const pathname = usePathname();
  const { openNLModal } = useUIStore();
  const allItems = [...navItems, ...secondaryNavItems];
  const currentTab = allItems.find((item) => pathname.startsWith(item.href))?.id || "dashboard";

  return (
    <aside className="fixed left-6 top-6 bottom-6 w-64 glass-card p-6 hidden md:flex flex-col justify-between">
      <div className="flex flex-col gap-8">
        {/* App Logo/Header */}
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg shadow-sm shadow-primary/30">
            F
          </div>
          <div>
            <h1 className="font-black text-xl tracking-tight text-foreground">
              FinWise
            </h1>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">finance tracker</p>
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
                  "relative flex items-center gap-3.5 px-4 py-2.5 rounded-2xl select-none outline-none transition-colors duration-200 text-sm font-medium",
                  isActive ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebarActiveNav"
                    className="absolute inset-0 bg-primary rounded-2xl shadow-sm shadow-primary/30"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <Icon className="relative z-10 w-5 h-5 shrink-0" />
                <span className="relative z-10">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Secondary Nav - Settings */}
      <nav className="flex flex-col gap-1.5 relative border-t border-border pt-4 mt-4">
        {secondaryNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "relative flex items-center gap-3.5 px-4 py-2.5 rounded-2xl select-none outline-none transition-colors duration-200 text-sm font-medium",
                isActive ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebarActiveNav"
                  className="absolute inset-0 bg-primary rounded-2xl shadow-sm shadow-primary/30"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <Icon className="relative z-10 w-5 h-5 shrink-0" />
              <span className="relative z-10">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Quick Transaction Action in Sidebar Footer */}
      <div className="flex flex-col gap-4">
        <motion.button
          onClick={openNLModal}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-2xl bg-primary hover:opacity-90 text-primary-foreground font-semibold text-sm shadow-md shadow-primary/30 transition-all duration-200 outline-none"
        >
          <Plus className="w-4 h-4" />
          <span>Add Transaction</span>
        </motion.button>
      </div>
    </aside>
  );
}
