"use client";

import { Check, Sun, Moon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  useThemeStore,
  colorThemes,
  cardStyles,
  buttonRadii,
  type CardStyle,
  type ButtonRadius,
} from "@/stores/themeStore";
import { useDashboardStore, chartDefs } from "@/stores/dashboardStore";

const cardPreviewClasses: Record<CardStyle, string> = {
  flat: "bg-card border border-border shadow-sm",
  elevated: "bg-card border-none shadow-lg",
  outlined: "bg-transparent border-[1.5px] border-border shadow-none",
  soft: "bg-muted border-none shadow-none",
};

const buttonRadiusValues: Record<ButtonRadius, string> = {
  none: "0.375rem",
  sm: "0.875rem",
  lg: "1.25rem",
  full: "999px",
};

export default function SettingsPage() {
  const {
    colorTheme,
    mode,
    cardStyle,
    buttonRadius,
    setColorTheme,
    setMode,
    setCardStyle,
    setButtonRadius,
  } = useThemeStore();
  const { enabledCharts, toggleChart } = useDashboardStore();

  return (
    <div className="flex flex-col gap-6 w-full text-foreground pb-8 max-w-2xl">
      <Card className="p-6 flex flex-col gap-4">
        <div>
          <h3 className="text-sm font-bold text-foreground">Appearance</h3>
          <p className="text-xs text-muted-foreground mt-1">Choose between light and dark mode.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setMode("light")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors",
              mode === "light"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            <Sun className="w-4 h-4" />
            Light
          </button>
          <button
            onClick={() => setMode("dark")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors",
              mode === "dark"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            <Moon className="w-4 h-4" />
            Dark
          </button>
        </div>
      </Card>

      <Card className="p-6 flex flex-col gap-4">
        <div>
          <h3 className="text-sm font-bold text-foreground">Accent Color</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Pick the primary color used across buttons, charts, and highlights.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {colorThemes.map((theme) => {
            const isActive = colorTheme === theme.id;
            return (
              <button
                key={theme.id}
                onClick={() => setColorTheme(theme.id)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors",
                  isActive
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-foreground/20"
                )}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: theme.swatch }}
                >
                  {isActive && <Check className="w-4 h-4 text-white" />}
                </div>
                <span className="text-xs font-semibold text-foreground">{theme.label}</span>
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="p-6 flex flex-col gap-4">
        <div>
          <h3 className="text-sm font-bold text-foreground">Card Style</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Choose how cards and panels are rendered across the app.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {cardStyles.map((style) => {
            const isActive = cardStyle === style.id;
            return (
              <button
                key={style.id}
                onClick={() => setCardStyle(style.id)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors",
                  isActive
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-foreground/20"
                )}
              >
                <div className={cn("w-full h-12 rounded-lg relative", cardPreviewClasses[style.id])}>
                  {isActive && (
                    <Check className="w-4 h-4 text-primary absolute top-1.5 right-1.5" />
                  )}
                </div>
                <span className="text-xs font-semibold text-foreground">{style.label}</span>
                <span className="text-[10px] text-muted-foreground text-center leading-tight">
                  {style.description}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="p-6 flex flex-col gap-4">
        <div>
          <h3 className="text-sm font-bold text-foreground">Button Border</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Choose the corner roundness used for buttons across the app.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {buttonRadii.map((radius) => {
            const isActive = buttonRadius === radius.id;
            return (
              <button
                key={radius.id}
                onClick={() => setButtonRadius(radius.id)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors",
                  isActive
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-foreground/20"
                )}
              >
                <div
                  className="w-full h-9 bg-primary flex items-center justify-center"
                  style={{ borderRadius: buttonRadiusValues[radius.id] }}
                >
                  {isActive && <Check className="w-4 h-4 text-primary-foreground" />}
                </div>
                <span className="text-xs font-semibold text-foreground">{radius.label}</span>
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="p-6 flex flex-col gap-4">
        <div>
          <h3 className="text-sm font-bold text-foreground">Dashboard Charts</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Choose which charts appear on your dashboard, and how many. Toggle any combination on or off.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          {chartDefs.map((chart) => {
            const isOn = enabledCharts.includes(chart.id);
            return (
              <button
                key={chart.id}
                onClick={() => toggleChart(chart.id)}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-xl border p-4 text-left transition-colors",
                  isOn
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-foreground/20"
                )}
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">{chart.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{chart.description}</p>
                </div>
                <div
                  className={cn(
                    "flex items-center justify-center w-9 h-5 rounded-full border shrink-0 transition-colors relative",
                    isOn ? "bg-primary border-primary" : "bg-muted border-border"
                  )}
                >
                  <span
                    className={cn(
                      "absolute h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                      isOn ? "translate-x-2" : "-translate-x-2"
                    )}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
