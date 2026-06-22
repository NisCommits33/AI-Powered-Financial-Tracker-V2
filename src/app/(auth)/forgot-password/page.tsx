"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClientComponentClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    const supabase = createClientComponentClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  };

  return (
    <AuthCard
      title={sent ? "Check your email" : "Reset your password"}
      description={sent ? "Use the secure link we sent to continue" : "We'll send you a secure password-reset link"}
    >
      {sent ? (
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"><Mail className="h-5 w-5" /></div>
          <p className="text-sm text-muted-foreground">
            If an account exists for <span className="font-medium text-foreground">{email}</span>, a reset link is on its way.
          </p>
          <Button variant="outline" className="w-full" onClick={() => setSent(false)}>Send another link</Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@example.com" required autoFocus />
          </div>
          <Button type="submit" disabled={loading} className="mt-2 w-full">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending link...</> : <><Mail className="h-4 w-4" /> Send reset link</>}
          </Button>
        </form>
      )}
      <Button asChild variant="link" className="mx-auto"><Link href="/login"><ArrowLeft className="h-4 w-4" /> Back to sign in</Link></Button>
    </AuthCard>
  );
}
