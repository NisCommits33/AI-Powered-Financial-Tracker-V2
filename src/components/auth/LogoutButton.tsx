"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { createClientComponentClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface LogoutButtonProps {
  collapsed?: boolean;
  mobileMenu?: boolean;
  onLoggedOut?: () => void;
}

export default function LogoutButton({
  collapsed = false,
  mobileMenu = false,
  onLoggedOut,
}: LogoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    const supabase = createClientComponentClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      toast.error("Unable to log out. Please try again.");
      setLoading(false);
      return;
    }

    onLoggedOut?.();
    router.replace("/login");
    router.refresh();
  };

  const Icon = loading ? Loader2 : LogOut;

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      title={collapsed ? "Log out" : undefined}
      aria-label="Log out"
      className={cn(
        "flex items-center transition-colors disabled:pointer-events-none disabled:opacity-60",
        mobileMenu
          ? "flex-col gap-1.5 rounded-xl px-2 py-3 text-muted-foreground hover:bg-muted hover:text-foreground"
          : "gap-3.5 rounded-2xl px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
        collapsed && !mobileMenu && "justify-center px-0",
      )}
    >
      <Icon className={cn("h-5 w-5 shrink-0", loading && "animate-spin")} />
      {mobileMenu ? (
        <span className="text-[11px] font-medium">{loading ? "Logging out" : "Log out"}</span>
      ) : (
        !collapsed && <span className="whitespace-nowrap">{loading ? "Logging out..." : "Log out"}</span>
      )}
    </button>
  );
}
