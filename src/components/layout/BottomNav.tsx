"use client";

import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard,
  Receipt,
  Wallet,
  MessageCircle,
  MoreHorizontal,
  PiggyBank,
  Goal,
  HandCoins,
  Settings,
  User,
  X,
} from "lucide-react";
import { useState } from "react";
import LogoutButton from "@/components/auth/LogoutButton";

const mainNav = [
  { path: "/dashboard", icon: LayoutDashboard, label: "Home" },
  { path: "/transactions", icon: Receipt, label: "Txns" },
  { path: "/accounts", icon: Wallet, label: "Accounts" },
  { path: "/chat", icon: MessageCircle, label: "Chat" },
];

const moreNav = [
  { path: "/budgets", icon: PiggyBank, label: "Budgets" },
  { path: "/goals", icon: Goal, label: "Goals" },
  { path: "/debts", icon: HandCoins, label: "Debts" },
  { path: "/settings", icon: Settings, label: "Settings" },
  { path: "/profile", icon: User, label: "Profile" },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);

  const isMoreActive = moreNav.some((item) => pathname.startsWith(item.path));

  const navigate = (path: string) => {
    setMoreOpen(false);
    router.push(path);
  };

  return (
    <>
      {/* More menu overlay */}
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="md:hidden fixed inset-0 z-40 bg-background/60 backdrop-blur-sm"
              onClick={() => setMoreOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="md:hidden fixed bottom-24 left-4 right-4 z-50 rounded-2xl border border-border bg-card shadow-xl p-2"
            >
              <div className="flex items-center justify-between px-3 py-2 mb-1">
                <span className="text-xs font-bold text-muted-foreground tracking-wider uppercase">More</span>
                <button
                  onClick={() => setMoreOpen(false)}
                  className="w-6 h-6 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  aria-label="Close more menu"
                  title="Close"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {moreNav.map((item) => {
                  const isActive = pathname.startsWith(item.path);
                  return (
                    <button
                      key={item.path}
                      onClick={() => navigate(item.path)}
                      className={`flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 transition-colors ${
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="text-[11px] font-medium">{item.label}</span>
                    </button>
                  );
                })}
                <LogoutButton mobileMenu onLoggedOut={() => setMoreOpen(false)} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom tab bar */}
      <div className="md:hidden fixed bottom-4 left-0 right-0 flex justify-center z-50">
        <div className="capsule-nav flex items-center gap-1 px-2 py-2 rounded-full">
          {mainNav.map((item) => {
            const isActive = pathname === item.path || pathname.startsWith(item.path);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="relative flex flex-col items-center justify-center px-4 py-2 rounded-full transition-all"
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute inset-0 bg-primary/15 rounded-full"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <item.icon className={`h-5 w-5 relative z-10 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`text-[10px] mt-1 relative z-10 font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setMoreOpen((v) => !v)}
            className="relative flex flex-col items-center justify-center px-4 py-2 rounded-full transition-all"
          >
            {(isMoreActive || moreOpen) && (
              <motion.div
                layoutId="activeNav"
                className="absolute inset-0 bg-primary/15 rounded-full"
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
            <MoreHorizontal className={`h-5 w-5 relative z-10 ${isMoreActive || moreOpen ? "text-primary" : "text-muted-foreground"}`} />
            <span className={`text-[10px] mt-1 relative z-10 font-medium ${isMoreActive || moreOpen ? "text-primary" : "text-muted-foreground"}`}>
              More
            </span>
          </button>
        </div>
      </div>
    </>
  );
}
