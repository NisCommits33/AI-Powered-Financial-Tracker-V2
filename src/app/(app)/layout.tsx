import { BottomNav } from "@/components/layout/BottomNav";
import SidebarNav from "@/components/layout/SidebarNav";
import FloatingAddButton from "@/components/layout/FloatingAddButton";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen w-full bg-zinc-50 dark:bg-[#09090b] flex flex-col md:flex-row overflow-x-hidden pb-32 md:pb-6">
      {/* Liquid Glass Background Blobs */}
      <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] md:left-[20%] w-[60%] md:w-[35%] aspect-square rounded-full bg-primary/10 blur-[80px] md:blur-[120px]" />
        <div className="absolute top-[30%] right-[-10%] w-[50%] md:w-[30%] aspect-square rounded-full bg-cyan-500/10 blur-[100px] md:blur-[140px]" />
        <div className="absolute bottom-[10%] left-[10%] w-[50%] md:w-[30%] aspect-square rounded-full bg-emerald-500/10 blur-[90px] md:blur-[130px]" />
      </div>

      {/* Sidebar Navigation - Desktop/Tablet */}
      <SidebarNav />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center w-full md:pl-72 md:pt-6">
        <main className="w-full max-w-md md:max-w-5xl px-4 pt-8 md:pt-0 flex-1 flex flex-col">
          {children}
        </main>
      </div>

      {/* Floating Add Action - Mobile Only */}
      <FloatingAddButton />

      {/* Bottom Floating Navigation Tab Bar - Mobile Only */}
      <BottomNav />
    </div>
  );
}
