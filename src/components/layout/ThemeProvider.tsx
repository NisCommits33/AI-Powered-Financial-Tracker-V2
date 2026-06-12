"use client";

import { useEffect } from "react";
import {
  useThemeStore,
  type ColorTheme,
  type CardStyle,
  type ButtonRadius,
} from "@/stores/themeStore";

const colorThemeClasses: ColorTheme[] = ["green", "terracotta", "blue", "purple"];
const cardStyleClasses: CardStyle[] = ["flat", "elevated", "outlined", "soft"];
const buttonRadiusClasses: ButtonRadius[] = ["none", "sm", "lg", "full"];

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { colorTheme, mode, cardStyle, buttonRadius } = useThemeStore();

  useEffect(() => {
    const root = document.documentElement;

    colorThemeClasses.forEach((t) => root.classList.remove(`theme-${t}`));
    root.classList.add(`theme-${colorTheme}`);

    cardStyleClasses.forEach((c) => root.classList.remove(`card-style-${c}`));
    root.classList.add(`card-style-${cardStyle}`);

    buttonRadiusClasses.forEach((r) => root.classList.remove(`btn-radius-${r}`));
    root.classList.add(`btn-radius-${buttonRadius}`);

    root.classList.toggle("dark", mode === "dark");
  }, [colorTheme, mode, cardStyle, buttonRadius]);

  return <>{children}</>;
}
