"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { Card } from "@/components/ui/card";

interface AuthCardProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export function AuthCard({ title, description, children }: AuthCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="w-full max-w-sm"
    >
      <Card className="flex flex-col gap-6 p-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <Image
            src="/final-logo.png"
            alt="FinWise logo"
            width={56}
            height={56}
            priority
            className="h-14 w-14 rounded-2xl object-cover shadow-sm shadow-primary/30"
          />
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-primary">FinWise</p>
            <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        {children}
      </Card>
    </motion.div>
  );
}
