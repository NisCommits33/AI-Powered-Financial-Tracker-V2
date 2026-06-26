"use client";

import Image from "next/image";
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
  PanelLeft,
  PanelLeftOpen,
  Goal,
  HandCoins,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";
import LogoutButton from "@/components/auth/LogoutButton";

const navItems = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { id: "transactions", label: "Transactions", href: "/transactions", icon: ArrowLeftRight },
  { id: "accounts", label: "Accounts", href: "/accounts", icon: Wallet },
  { id: "budgets", label: "Budgets", href: "/budgets", icon: PiggyBank },
  { id: "goals", label: "Goals", href: "/goals", icon: Goal },
  { id: "debts", label: "Debts & Loans", href: "/debts", icon: HandCoins },
  { id: "chat", label: "Grok Chat", href: "/chat", icon: MessageSquare },
];

const secondaryNavItems = [
  { id: "settings", label: "Settings", href: "/settings", icon: Settings },
  { id: "profile", label: "Profile", href: "/profile", icon: User },
];

export default function SidebarNav() {
  const pathname = usePathname();
  const { openNLModal, sidebarCollapsed, toggleSidebar } = useUIStore();
  const allItems = [...navItems, ...secondaryNavItems];
  const currentTab = allItems.find((item) => pathname.startsWith(item.href))?.id || "dashboard";

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 88 : 256 }}
      transition={{ type: "spring", stiffness: 400, damping: 35 }}
      className="fixed left-6 top-6 bottom-6 glass-card p-4 hidden md:flex flex-col justify-between overflow-hidden"
    >
      <div className="flex flex-col gap-8">
        {/* App Logo/Header */}
        <div className={cn("flex items-center gap-3", sidebarCollapsed ? "justify-center px-0" : "px-2")}>
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full">
            <Image
              src="/final-logo.png"
              alt="FinWise logo"
              width={48}
              height={48}
              priority
              className="h-full w-full scale-[1.18] rounded-full object-cover"
            />
          </div>
          {!sidebarCollapsed && (
            <div className="overflow-hidden whitespace-nowrap">
              <h1 className="font-serif font-semibold text-xl tracking-tight text-foreground">
                FinWise
              </h1>
              <p className="text-[10px] text-[#9b7a22] font-bold uppercase tracking-wider">finance tracker</p>
            </div>
          )}
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
                title={sidebarCollapsed ? item.label : undefined}
                className={cn(
                  "relative flex items-center gap-3.5 px-4 py-2.5 rounded-2xl select-none outline-none transition-colors duration-200 text-sm font-medium overflow-hidden",
                  sidebarCollapsed && "justify-center px-0",
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
                {!sidebarCollapsed && <span className="relative z-10 whitespace-nowrap">{item.label}</span>}
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
              title={sidebarCollapsed ? item.label : undefined}
              className={cn(
                "relative flex items-center gap-3.5 px-4 py-2.5 rounded-2xl select-none outline-none transition-colors duration-200 text-sm font-medium overflow-hidden",
                sidebarCollapsed && "justify-center px-0",
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
              {!sidebarCollapsed && <span className="relative z-10 whitespace-nowrap">{item.label}</span>}
            </Link>
          );
        })}
        <LogoutButton collapsed={sidebarCollapsed} />
      </nav>

      {/* Quick Transaction Action + Collapse Toggle */}
      <div className="flex flex-col gap-2">
        <motion.button
          onClick={openNLModal}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          title={sidebarCollapsed ? "Add Transaction" : undefined}
          className={cn(
            "flex items-center justify-center gap-2 w-full py-2.5 rounded-2xl bg-primary hover:opacity-90 text-primary-foreground font-semibold text-sm shadow-md shadow-primary/30 transition-all duration-200 outline-none overflow-hidden"
          )}
        >
          <Plus className="w-4 h-4 shrink-0" />
          {!sidebarCollapsed && <span className="whitespace-nowrap">Add Transaction</span>}
        </motion.button>

        <button
          onClick={toggleSidebar}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex items-center justify-center gap-2 w-full py-2 rounded-2xl text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors duration-200 outline-none text-sm font-medium"
        >
          {sidebarCollapsed ? <PanelLeftOpen className="w-5 h-5 shrink-0" /> : <PanelLeft className="w-5 h-5 shrink-0" />}
          {!sidebarCollapsed && <span className="whitespace-nowrap">Collapse</span>}
        </button>
      </div>
    </motion.aside>
  );
}
