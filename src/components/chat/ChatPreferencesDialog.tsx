"use client";

import { useState } from "react";
import { Settings2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ALL_CATEGORIES } from "@/lib/categories";
import type { ChatPreferences } from "@/lib/chatPreferences";

interface ChatPreferencesDialogProps {
  preferences: ChatPreferences;
  onChange: (preferences: ChatPreferences) => void;
}

export function ChatPreferencesDialog({ preferences, onChange }: ChatPreferencesDialogProps) {
  const [open, setOpen] = useState(false);
  const [nickname, setNickname] = useState(preferences.nickname || "");
  const [newKeyword, setNewKeyword] = useState("");
  const [newCategory, setNewCategory] = useState(ALL_CATEGORIES[0]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) onChange({ ...preferences, nickname: nickname.trim() });
  };

  const addRule = () => {
    if (!newKeyword.trim()) return;
    const rules = [...preferences.categoryRules, { keyword: newKeyword.trim(), category: newCategory }];
    onChange({ ...preferences, categoryRules: rules });
    setNewKeyword("");
  };

  const removeRule = (index: number) => {
    const rules = preferences.categoryRules.filter((_, i) => i !== index);
    onChange({ ...preferences, categoryRules: rules });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Chat preferences">
          <Settings2 className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Chat Preferences</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nickname">What should I call you?</Label>
            <Input
              id="nickname"
              placeholder="e.g., Alex"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Custom categorization rules</Label>
            <p className="text-xs text-muted-foreground">
              When you log a transaction by chat, descriptions containing a keyword will use the matching category.
            </p>
            <div className="flex flex-col gap-2">
              {preferences.categoryRules.map((rule, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 truncate">
                    &quot;{rule.keyword}&quot; → <span className="font-medium">{rule.category}</span>
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => removeRule(i)}
                    aria-label="Remove rule"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              {preferences.categoryRules.length === 0 && (
                <p className="text-xs text-muted-foreground">No rules yet.</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="e.g., Uber"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                className="flex-1"
              />
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger className="w-32 shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={addRule} disabled={!newKeyword.trim()}>
                Add
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
