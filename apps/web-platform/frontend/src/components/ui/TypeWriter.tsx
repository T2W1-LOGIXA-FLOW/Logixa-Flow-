"use client";

import React, { useEffect, useState } from "react";

export default function TypeWriter({ text, speed = 40 }: { text: string; speed?: number }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
    if (!text) return;
    const id = setInterval(() => {
      setIndex((i) => {
        if (i >= text.length) {
          clearInterval(id);
          return i;
        }
        return i + 1;
      });
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);

  return <span>{text.slice(0, index)}</span>;
}
