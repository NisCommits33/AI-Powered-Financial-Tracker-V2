import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";

export default function AuthErrorPage() {
  return (
    <AuthCard title="Link expired or invalid" description="This authentication link could not be verified">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive"><AlertCircle className="h-5 w-5" /></div>
        <p className="text-sm text-muted-foreground">Request a fresh link and make sure you open the most recent email.</p>
        <Button asChild className="w-full"><Link href="/forgot-password">Request a new link</Link></Button>
        <Button asChild variant="link"><Link href="/login">Back to sign in</Link></Button>
      </div>
    </AuthCard>
  );
}
