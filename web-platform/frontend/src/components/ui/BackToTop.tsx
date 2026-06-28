"use client";

import React, { useEffect, useState } from "react";
import Button from "@/components/shadcn/Button";

export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 300);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <Button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-8 right-8 z-50 rounded-full p-3 shadow-lg text-white"
      style={{ background: "linear-gradient(90deg, var(--cyan), var(--purple))" }}
      aria-label="Back to top"
    >
      ↑
    </Button>
  );
}
