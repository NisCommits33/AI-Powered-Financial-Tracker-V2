"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { useUIStore } from "@/stores/uiStore";
import { useTransactions } from "@/hooks/useTransactions";
import { toast } from "sonner";
import { Transaction } from "@/types";

type ParsedTransaction = Partial<Omit<Transaction, "id" | "created_at">>;

export default function NLInputModal() {
  const { isNLModalOpen, closeNLModal } = useUIStore();
  const { fetchTransactions } = useTransactions();
  const [nlText, setNlText] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedTransaction | undefined>(undefined);

  const handleClose = (open: boolean) => {
    if (!open) {
      closeNLModal();
      setNlText("");
      setShowManual(false);
      setParsedData(undefined);
    }
  };

  const handleParse = async () => {
    const text = nlText.trim();
    if (!text) return;

    setParsing(true);
    try {
      const res = await fetch("/api/nl-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Couldn't parse that. Try entering it manually.");
        setShowManual(true);
        return;
      }

      setParsedData({
        amount: data.amount,
        description: data.description,
        category: data.category,
        date: data.date,
        account_id: data.account_id || undefined,
      });
      setShowManual(true);
    } catch {
      toast.error("Couldn't reach the AI assistant. Try entering it manually.");
      setShowManual(true);
    } finally {
      setParsing(false);
    }
  };

  return (
    <Dialog open={isNLModalOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent" />
            Quick Add
          </DialogTitle>
          <DialogDescription>
            Describe your transaction in plain language, e.g. &ldquo;spent 450 on dal bhat at Roadhouse&rdquo;
          </DialogDescription>
        </DialogHeader>

        {!showManual ? (
          <div className="flex flex-col gap-3">
            <Input
              autoFocus
              placeholder="spent 450 on dal bhat..."
              value={nlText}
              disabled={parsing}
              onChange={(e) => setNlText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleParse();
              }}
            />
            <Button disabled={!nlText.trim() || parsing} onClick={handleParse} className="w-full">
              {parsing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Parsing...
                </>
              ) : (
                "Parse with AI"
              )}
            </Button>
            <button
              type="button"
              onClick={() => setShowManual(true)}
              disabled={parsing}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline self-center"
            >
              or enter details manually
            </button>
          </div>
        ) : (
          <TransactionForm
            key={parsedData ? JSON.stringify(parsedData) : "manual"}
            initialData={parsedData}
            onSuccess={() => {
              fetchTransactions();
              handleClose(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
