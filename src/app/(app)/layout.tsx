import { BottomNav } from "@/components/layout/BottomNav";
import SidebarNav from "@/components/layout/SidebarNav";
import FloatingAddButton from "@/components/layout/FloatingAddButton";
import NLInputModal from "@/components/transactions/NLInputModal";
import TopBar from "@/components/layout/TopBar";
import ContentArea from "@/components/layout/ContentArea";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen w-full bg-background flex flex-col md:flex-row overflow-x-hidden pb-32 md:pb-6">
      {/* Sidebar Navigation - Desktop/Tablet */}
      <SidebarNav />

      {/* Main Content Area */}
      <ContentArea>
        <main className="w-full max-w-md md:max-w-5xl px-4 pt-8 md:pt-0 flex-1 flex flex-col">
          <TopBar />
          {children}
        </main>
      </ContentArea>

      {/* Floating Add Action - Mobile Only */}
      <FloatingAddButton />

      {/* Bottom Floating Navigation Tab Bar - Mobile Only */}
      <BottomNav />

      {/* Quick-add Natural Language Modal */}
      <NLInputModal />
    </div>
  );
}
