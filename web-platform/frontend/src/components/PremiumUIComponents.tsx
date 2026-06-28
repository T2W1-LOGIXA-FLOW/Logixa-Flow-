"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ReactNode, useState } from "react";

/**
 * Premium Modal Component
 * Accessible modal with animations
 */
export function PremiumModal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = "md",
}: {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
}) {
  const widths = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`
                ${widths[maxWidth]} w-full
                bg-slate-900 border border-slate-700 rounded-xl
                shadow-2xl overflow-hidden
              `}
            >
              {title && (
                <div className="px-6 py-4 border-b border-slate-700">
                  <h2 className="text-xl font-bold text-white">{title}</h2>
                </div>
              )}
              <div className="px-6 py-4">{children}</div>
              {footer && (
                <div className="px-6 py-4 border-t border-slate-700 flex justify-end gap-2">
                  {footer}
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Premium Accordion Component
 * Expandable accordion items with animations
 */
export function PremiumAccordion({
  items,
}: {
  items: Array<{ title: string; content: ReactNode }>;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <motion.div key={index} className="overflow-hidden rounded-lg border border-slate-700">
          <motion.button
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
            className="w-full px-6 py-4 text-left font-semibold text-white hover:bg-slate-800/50 transition-colors flex justify-between items-center"
          >
            {item.title}
            <motion.div
              animate={{ rotate: openIndex === index ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              ▼
            </motion.div>
          </motion.button>
          <AnimatePresence>
            {openIndex === index && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="px-6 py-4 bg-slate-800/30 text-slate-300"
              >
                {item.content}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ))}
    </div>
  );
}

/**
 * Premium Tabs Component
 * Tabbed interface with animations
 */
export function PremiumTabs({
  tabs,
}: {
  tabs: Array<{ label: string; content: ReactNode }>;
}) {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div>
      <div className="flex gap-0 border-b border-slate-700">
        {tabs.map((tab, index) => (
          <motion.button
            key={index}
            onClick={() => setActiveTab(index)}
            className={`
              px-6 py-3 font-semibold relative
              ${activeTab === index ? "text-cyan-400" : "text-slate-400 hover:text-white"}
              transition-colors
            `}
          >
            {tab.label}
            {activeTab === index && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-orange-500"
                initial={false}
                transition={{ duration: 0.3 }}
              />
            )}
          </motion.button>
        ))}
      </div>
      <div className="mt-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {tabs[activeTab].content}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/**
 * Premium Alert Component
 * Dismissible alert with animations
 */
export function PremiumAlert({
  type = "info",
  title,
  message,
  onDismiss,
  dismissible = true,
}: {
  type?: "success" | "error" | "warning" | "info";
  title?: string;
  message: string;
  onDismiss?: () => void;
  dismissible?: boolean;
}) {
  const [isVisible, setIsVisible] = useState(true);

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  const colors = {
    success: "bg-green-500/10 border-green-500/30 text-green-300",
    error: "bg-red-500/10 border-red-500/30 text-red-300",
    warning: "bg-yellow-500/10 border-yellow-500/30 text-yellow-300",
    info: "bg-cyan-500/10 border-cyan-500/30 text-cyan-300",
  };

  const icons = {
    success: "✓",
    error: "✕",
    warning: "!",
    info: "ℹ",
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={`
            rounded-lg border p-4 flex gap-4 items-start
            ${colors[type]}
          `}
        >
          <div className="flex-shrink-0 text-xl font-bold">
            {icons[type]}
          </div>
          <div className="flex-1">
            {title && <h3 className="font-semibold mb-1">{title}</h3>}
            <p className="text-sm">{message}</p>
          </div>
          {dismissible && (
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
            >
              ✕
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Premium Tooltip Component
 * Floating tooltip with animations
 */
export function PremiumTooltip({
  text,
  children,
  position = "top",
}: {
  text: string;
  children: ReactNode;
  position?: "top" | "bottom" | "left" | "right";
}) {
  const [isVisible, setIsVisible] = useState(false);

  const positions = {
    top: "-top-12 left-1/2 -translate-x-1/2",
    bottom: "top-12 left-1/2 -translate-x-1/2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`
              absolute ${positions[position]}
              px-3 py-2 bg-slate-900 text-white text-sm rounded-lg
              whitespace-nowrap z-50
              border border-slate-700
            `}
          >
            {text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Premium Progress Bar Component
 * Animated progress bar
 */
export function PremiumProgress({
  value,
  max = 100,
  label,
  animated = true,
}: {
  value: number;
  max?: number;
  label?: string;
  animated?: boolean;
}) {
  const percentage = (value / max) * 100;

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex justify-between items-center">
          <span className="text-sm font-semibold text-slate-300">{label}</span>
          <span className="text-sm text-slate-400">{Math.round(percentage)}%</span>
        </div>
      )}
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-cyan-500 to-orange-500"
          animate={{ width: `${percentage}%` }}
          transition={
            animated ? { duration: 0.5, ease: "easeOut" } : { duration: 0 }
          }
        />
      </div>
    </div>
  );
}

/**
 * Premium Badge Component
 * Animated badge for status/tags
 */
export function PremiumBadge({
  children,
  variant = "default",
  animated = false,
}: {
  children: ReactNode;
  variant?: "default" | "success" | "error" | "warning" | "info";
  animated?: boolean;
}) {
  const variants = {
    default: "bg-slate-700 text-white",
    success: "bg-green-500/20 text-green-300 border border-green-500/30",
    error: "bg-red-500/20 text-red-300 border border-red-500/30",
    warning: "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30",
    info: "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30",
  };

  return (
    <motion.span
      className={`
        inline-block px-3 py-1 rounded-full text-xs font-semibold
        ${variants[variant]}
      `}
      animate={animated ? { scale: [1, 1.05, 1] } : {}}
      transition={
        animated ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : {}
      }
    >
      {children}
    </motion.span>
  );
}
