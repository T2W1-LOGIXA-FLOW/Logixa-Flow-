"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * Page Transition Wrapper
 * Provides smooth fade and scale transitions between routes
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Scroll Progress Indicator
 * Shows reading progress at the top of the page
 */
export function ScrollProgressBar() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const updateProgress = () => {
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const scrolled = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setProgress(scrolled);
    };

    window.addEventListener("scroll", updateProgress);
    return () => window.removeEventListener("scroll", updateProgress);
  }, []);

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-orange-500 z-50 origin-left"
      style={{ scaleX: progress / 100 }}
    />
  );
}

/**
 * Floating Notification Badge
 * Displays temporary success/error messages
 */
export function FloatingBadge({
  message,
  type = "success",
  duration = 3000,
}: {
  message: string;
  type?: "success" | "error" | "info";
  duration?: number;
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), duration);
    return () => clearTimeout(timer);
  }, [duration]);

  const colors = {
    success: "bg-green-500/20 border-green-500/50 text-green-300",
    error: "bg-red-500/20 border-red-500/50 text-red-300",
    info: "bg-cyan-500/20 border-cyan-500/50 text-cyan-300",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : -20 }}
      exit={{ opacity: 0, y: -20 }}
      className={`fixed top-20 right-4 px-4 py-3 rounded-lg border backdrop-blur-md ${colors[type]}`}
    >
      {message}
    </motion.div>
  );
}

/**
 * Animated Counter
 * Counts from 0 to target number with animation
 */
export function AnimatedNumber({
  value,
  duration = 2,
  suffix = "",
}: {
  value: number;
  duration?: number;
  suffix?: string;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const increment = value / (duration * 60); // 60 frames per second
    let animationFrame: NodeJS.Timeout;

    const animate = () => {
      if (start < value) {
        start += increment;
        setCount(Math.min(Math.floor(start), value));
        animationFrame = setTimeout(animate, 1000 / 60);
      }
    };

    animate();
    return () => clearTimeout(animationFrame);
  }, [value, duration]);

  return (
    <span>
      {count}
      {suffix}
    </span>
  );
}

/**
 * Ripple Effect Button
 * Shows ripple on click
 */
export function RippleButton({
  children,
  onClick,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const [ripples, setRipples] = useState<
    Array<{ id: number; x: number; y: number }>
  >([]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const id = Date.now();
    setRipples((prev) => [...prev, { id, x, y }]);

    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 600);

    onClick?.(e);
  };

  return (
    <button
      {...props}
      onClick={handleClick}
      className={`relative overflow-hidden ${className}`}
    >
      {children}
      {ripples.map((ripple) => (
        <motion.div
          key={ripple.id}
          className="absolute pointer-events-none rounded-full bg-white/30"
          initial={{ width: 0, height: 0, opacity: 1 }}
          animate={{ width: 400, height: 400, opacity: 0 }}
          transition={{ duration: 0.6 }}
          style={{
            left: ripple.x - 200,
            top: ripple.y - 200,
          }}
        />
      ))}
    </button>
  );
}

/**
 * Loading Spinner
 * Premium loading animation
 */
export function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  return (
    <motion.div
      className={`${sizes[size]} border-2 border-slate-600 border-t-cyan-500 rounded-full`}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    />
  );
}

/**
 * Animated List Item
 * Staggered animation for list items
 */
export function AnimatedListItem({
  children,
  index = 0,
}: {
  children: React.ReactNode;
  index?: number;
}) {
  return (
    <motion.li
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      viewport={{ once: true }}
    >
      {children}
    </motion.li>
  );
}

/**
 * Glassmorphism Card
 * Premium glass effect card
 */
export function GlassCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`
        relative overflow-hidden rounded-2xl backdrop-blur-xl
        bg-white/5 border border-white/10 shadow-2xl
        p-6 transition-all duration-300
        hover:border-white/20 hover:bg-white/10
        ${className}
      `}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

/**
 * Glow Border Effect
 * Adds animated glow to borders
 */
export function GlowBorder({
  children,
  color = "cyan",
  className = "",
}: {
  children: React.ReactNode;
  color?: "cyan" | "orange" | "gradient";
  className?: string;
}) {
  const colors = {
    cyan: "from-cyan-500 to-cyan-500/0",
    orange: "from-orange-500 to-orange-500/0",
    gradient: "from-cyan-500 via-orange-500 to-cyan-500/0",
  };

  return (
    <div className={`relative ${className}`}>
      <motion.div
        className={`absolute inset-0 rounded-lg bg-gradient-to-r ${colors[color]} p-[2px]`}
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        <div className="absolute inset-0 bg-slate-900 rounded-lg" />
      </motion.div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
