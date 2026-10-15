"use client";

import React from "react";

export default function Skeleton({ className = "", style = {} }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`bg-slate-200 dark:bg-slate-700 rounded-md ${className} animate-pulse`} style={style} />;
}
