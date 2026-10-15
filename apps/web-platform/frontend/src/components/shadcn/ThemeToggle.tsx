"use client";

import { useTheme } from "./ThemeProvider";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  const toggle = () => {
    setTheme("dark");
  };

  return (
    <button
      onClick={toggle}
      className="nav-gradient-link rounded-md px-2 py-1 text-xs font-semibold"
      aria-label="Dark mode (locked)"
      style={{ background: "transparent", border: "none", cursor: "pointer" }}
    >
      {isDark ? "Dark" : "Dark"}
    </button>
  );
}
