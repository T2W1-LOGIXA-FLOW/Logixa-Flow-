"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <AnimatePresence mode="wait">
      <motion.div key={pathname || "root"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
