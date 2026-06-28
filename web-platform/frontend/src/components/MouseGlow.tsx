"use client";

import { useEffect } from "react";

export default function MouseGlow() {
  useEffect(() => {
    let lastSpark = 0;

    function createSpark(event: PointerEvent, index: number) {
      const spark = document.createElement("span");
      const offsetX = (Math.random() - 0.5) * 26;
      const offsetY = (Math.random() - 0.5) * 26;
      const driftX = (Math.random() - 0.5) * 34;
      const driftY = -18 - Math.random() * 28;
      const size = 3 + Math.random() * 5;

      spark.className = "mouse-spark";
      spark.style.left = `${event.clientX + offsetX}px`;
      spark.style.top = `${event.clientY + offsetY}px`;
      spark.style.setProperty("--spark-x", `${driftX}px`);
      spark.style.setProperty("--spark-y", `${driftY}px`);
      spark.style.setProperty("--spark-size", `${size}px`);
      spark.style.animationDelay = `${index * 24}ms`;
      document.body.appendChild(spark);
      window.setTimeout(() => spark.remove(), 920);
    }

    function moveGlow(event: PointerEvent) {
      const now = performance.now();
      if (now - lastSpark < 38) {
        return;
      }
      lastSpark = now;

      Array.from({ length: 3 }).forEach((_, index) => createSpark(event, index));
    }

    window.addEventListener("pointermove", moveGlow, { passive: true });
    return () => window.removeEventListener("pointermove", moveGlow);
  }, []);

  return null;
}
