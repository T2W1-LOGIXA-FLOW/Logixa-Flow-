"use client";

import { useEffect, useRef, useState } from "react";

export default function LiveCounter({ target = 97.4, duration = 2000, decimals = 1 }: { target?: number; duration?: number; decimals?: number }) {
  const [value, setValue] = useState(0);
  const startRef = useRef<number | null>(null);
  const startValue = 0;

  useEffect(() => {
    let rafId: number;
    function step(timestamp: number) {
      if (startRef.current === null) startRef.current = timestamp;
      const progress = Math.min(1, (timestamp - (startRef.current as number)) / duration);
      const current = startValue + (target - startValue) * progress;
      setValue(Number(current.toFixed(decimals)));
      if (progress < 1) rafId = requestAnimationFrame(step);
    }
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [target, duration, decimals]);

  return <span>{value.toFixed(decimals)}</span>;
}
