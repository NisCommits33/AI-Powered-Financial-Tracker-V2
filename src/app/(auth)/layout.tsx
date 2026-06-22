export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div className="glass-blob absolute left-[10%] top-[-10%] aspect-square w-[55%] rounded-full bg-primary/25" />
        <div className="glass-blob absolute bottom-[-15%] right-[-5%] aspect-square w-[55%] rounded-full bg-secondary/20" />
        <div className="glass-blob absolute right-[15%] top-[30%] aspect-square w-[35%] rounded-full bg-accent/25" />
      </div>
      {children}
    </div>
  );
}
