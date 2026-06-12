import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ColorTheme = "green" | "terracotta" | "blue" | "purple";
export type Mode = "light" | "dark";
export type CardStyle = "flat" | "elevated" | "outlined" | "soft";
export type ButtonRadius = "none" | "sm" | "lg" | "full";

interface ThemeStore {
  colorTheme: ColorTheme;
  mode: Mode;
  cardStyle: CardStyle;
  buttonRadius: ButtonRadius;
  setColorTheme: (theme: ColorTheme) => void;
  setMode: (mode: Mode) => void;
  setCardStyle: (style: CardStyle) => void;
  setButtonRadius: (radius: ButtonRadius) => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      colorTheme: "green",
      mode: "light",
      cardStyle: "flat",
      buttonRadius: "lg",
      setColorTheme: (colorTheme) => set({ colorTheme }),
      setMode: (mode) => set({ mode }),
      setCardStyle: (cardStyle) => set({ cardStyle }),
      setButtonRadius: (buttonRadius) => set({ buttonRadius }),
    }),
    {
      name: "finwise-theme",
    }
  )
);

export const colorThemes: { id: ColorTheme; label: string; swatch: string }[] = [
  { id: "green", label: "Emerald", swatch: "#16a34a" },
  { id: "terracotta", label: "Terracotta", swatch: "#d97757" },
  { id: "blue", label: "Ocean Blue", swatch: "#2563eb" },
  { id: "purple", label: "Violet", swatch: "#7c3aed" },
];

export const cardStyles: { id: CardStyle; label: string; description: string }[] = [
  { id: "flat", label: "Flat", description: "Subtle border with a light shadow" },
  { id: "elevated", label: "Elevated", description: "No border, soft floating shadow" },
  { id: "outlined", label: "Outlined", description: "Transparent fill, clear border" },
  { id: "soft", label: "Soft", description: "Tinted background, no border or shadow" },
];

export const buttonRadii: { id: ButtonRadius; label: string }[] = [
  { id: "none", label: "Sharp" },
  { id: "sm", label: "Slight" },
  { id: "lg", label: "Rounded" },
  { id: "full", label: "Pill" },
];
