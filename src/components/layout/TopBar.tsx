"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Search, Settings } from "lucide-react";
import { Input } from "@/components/ui/input";

const titles: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": { title: "Welcome back", subtitle: "Dashboard" },
  "/transactions": { title: "All Transactions", subtitle: "Finance" },
  "/accounts": { title: "Accounts", subtitle: "Finance" },
  "/budgets": { title: "Budgets", subtitle: "Finance" },
  "/chat": { title: "Ask FinWise", subtitle: "Grok Chat" },
  "/settings": { title: "Settings", subtitle: "Preferences" },
};

export default function TopBar() {
  const pathname = usePathname();
  const entry = Object.entries(titles).find(([path]) => pathname.startsWith(path));
  const { title, subtitle } = entry?.[1] ?? { title: "FinWise", subtitle: "Finance" };

  return (
    <header className="sticky top-0 z-30 -mx-4 md:mx-0 mb-2 md:mb-6">
      <div className="flex items-center justify-between gap-4 px-4 md:px-0 py-4 md:py-0">
        <div>
          <p className="text-xs font-bold text-muted-foreground tracking-wider uppercase">{subtitle}</p>
          <h1 className="text-2xl md:text-4xl font-black tracking-tight text-foreground">{title}</h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search..." className="pl-9 w-52 bg-transparent" />
          </div>
          <Link
            href="/settings"
            className="hidden sm:flex w-10 h-10 rounded-full glass-card items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </Link>
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center font-bold text-primary-foreground text-sm shadow-sm shadow-primary/30 shrink-0">
            U
          </div>
        </div>
      </div>
    </header>
  );
}
