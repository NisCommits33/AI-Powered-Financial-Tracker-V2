"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Sparkles } from "lucide-react";

export default function GrokChatBubble() {
  return (
    <Link href="/chat" aria-label="Open Grok chat" title="Open Grok chat">
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-24 right-6 md:bottom-6 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center"
      >
        <Sparkles className="w-5 h-5" />
      </motion.div>
    </Link>
  );
}
