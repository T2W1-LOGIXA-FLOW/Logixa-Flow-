"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";

export function CardSkeleton() {
  return (
    <motion.div
      className="logixa-card p-6 space-y-4"
      animate={{ opacity: [0.6, 0.8, 0.6] }}
      transition={{ duration: 1.5, repeat: Infinity }}
    >
      <div className="h-4 bg-gradient-to-r from-slate-700 to-slate-600 rounded w-3/4" />
      <div className="h-3 bg-gradient-to-r from-slate-700 to-slate-600 rounded w-full" />
      <div className="h-3 bg-gradient-to-r from-slate-700 to-slate-600 rounded w-5/6" />
      <div className="h-12 bg-gradient-to-r from-slate-700 to-slate-600 rounded mt-4" />
    </motion.div>
  );
}

export function GridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-8">
      {/* Hero skeleton */}
      <motion.div
        className="h-48 bg-gradient-to-r from-slate-800 to-slate-700 rounded-lg"
        animate={{ opacity: [0.6, 0.8, 0.6] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
      {/* Content skeleton */}
      <GridSkeleton count={6} />
    </div>
  );
}

export function PostCardSkeleton() {
  return (
    <motion.div
      className="logixa-card p-6 space-y-4"
      animate={{ opacity: [0.6, 0.8, 0.6] }}
      transition={{ duration: 1.5, repeat: Infinity }}
    >
      <div className="h-40 bg-gradient-to-r from-slate-700 to-slate-600 rounded" />
      <div className="h-4 bg-gradient-to-r from-slate-700 to-slate-600 rounded w-2/3" />
      <div className="h-3 bg-gradient-to-r from-slate-700 to-slate-600 rounded" />
      <div className="h-3 bg-gradient-to-r from-slate-700 to-slate-600 rounded w-5/6" />
    </motion.div>
  );
}

export function AnimatedCounter({ end, duration = 2 }: { end: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCount((prev) => (prev < end ? prev + 1 : end));
    }, duration * 10);
    return () => clearInterval(interval);
  }, [end, duration]);

  return <span>{count}</span>;
}
