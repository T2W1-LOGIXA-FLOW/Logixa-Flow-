"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark";  // Only dark mode supported

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  setTheme: () => {},
});

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
};

export function useTheme() {
  return useContext(ThemeContext);
}

export default function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    try {
      // Ensure dark class is always on html element
      document.documentElement.classList.add("dark");
      localStorage.setItem("logixa_theme", "dark");
    } catch {
      // ignore
    }
  }, []);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}
