"use client";

import { motion } from "framer-motion";
import { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, useState } from "react";

interface PremiumInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export function PremiumInput({
  label,
  error,
  helperText,
  className = "",
  ...props
}: PremiumInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <motion.div className="space-y-2">
      {label && (
        <label className="block text-sm font-semibold text-slate-300">
          {label}
        </label>
      )}
      <motion.div
        className={`relative overflow-hidden rounded-lg border transition-all duration-200 ${
          error
            ? "border-red-500/50 bg-red-500/5"
            : isFocused
              ? "border-cyan-500/50 bg-cyan-500/5"
              : "border-slate-700 bg-slate-800/30"
        }`}
        animate={{
          boxShadow: isFocused
            ? "0 0 20px rgba(0, 163, 255, 0.2)"
            : "0 0 0px rgba(0, 163, 255, 0)",
        }}
      >
        <input
          {...props}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          className={`w-full bg-transparent px-4 py-2 outline-none text-white placeholder-slate-500 ${className}`}
        />
      </motion.div>
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-red-400"
        >
          {error}
        </motion.p>
      )}
      {helperText && !error && (
        <p className="text-sm text-slate-400">{helperText}</p>
      )}
    </motion.div>
  );
}

interface PremiumButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
}

export function PremiumButton({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  children,
  disabled,
  className = "",
  ...props
}: PremiumButtonProps) {
  const variants: Record<string, string> = {
    primary:
      "bg-gradient-to-r from-cyan-500 to-orange-500 text-white hover:shadow-lg hover:shadow-cyan-500/30",
    secondary: "bg-slate-700 text-white hover:bg-slate-600",
    outline:
      "border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10",
    ghost: "text-slate-300 hover:text-white hover:bg-slate-700/50",
  };

  const sizes: Record<string, string> = {
    sm: "px-3 py-1 text-sm",
    md: "px-6 py-2 text-base",
    lg: "px-8 py-3 text-lg",
  };

  return (
    <motion.button
      whileHover={!disabled && !loading ? { scale: 1.05 } : {}}
      whileTap={!disabled && !loading ? { scale: 0.95 } : {}}
      disabled={disabled || loading}
      className={`relative inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...(Object.fromEntries(Object.entries(props).filter(([key]) => !['onDrag', 'onDragStart', 'onDragEnd'].includes(key))))}
    >
      {loading && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
        />
      )}
      {icon && !loading && <span>{icon}</span>}
      {children}
    </motion.button>
  );
}

interface PremiumTextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function PremiumTextarea({
  label,
  error,
  className = "",
  ...props
}: PremiumTextareaProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <motion.div className="space-y-2">
      {label && (
        <label className="block text-sm font-semibold text-slate-300">
          {label}
        </label>
      )}
      <motion.div
        className={`relative overflow-hidden rounded-lg border transition-all duration-200 ${
          error
            ? "border-red-500/50 bg-red-500/5"
            : isFocused
              ? "border-cyan-500/50 bg-cyan-500/5"
              : "border-slate-700 bg-slate-800/30"
        }`}
        animate={{
          boxShadow: isFocused
            ? "0 0 20px rgba(0, 163, 255, 0.2)"
            : "0 0 0px rgba(0, 163, 255, 0)",
        }}
      >
        <textarea
          {...props}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          className={`w-full bg-transparent px-4 py-2 outline-none text-white placeholder-slate-500 resize-none ${className}`}
        />
      </motion.div>
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-red-400"
        >
          {error}
        </motion.p>
      )}
    </motion.div>
  );
}

interface PremiumSelectProps
  extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
}

export function PremiumSelect({
  label,
  error,
  options,
  className = "",
  ...props
}: PremiumSelectProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <motion.div className="space-y-2">
      {label && (
        <label className="block text-sm font-semibold text-slate-300">
          {label}
        </label>
      )}
      <motion.div
        className={`relative overflow-hidden rounded-lg border transition-all duration-200 ${
          error
            ? "border-red-500/50 bg-red-500/5"
            : isFocused
              ? "border-cyan-500/50 bg-cyan-500/5"
              : "border-slate-700 bg-slate-800/30"
        }`}
        animate={{
          boxShadow: isFocused
            ? "0 0 20px rgba(0, 163, 255, 0.2)"
            : "0 0 0px rgba(0, 163, 255, 0)",
        }}
      >
        <select
          {...props}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          className={`w-full bg-transparent px-4 py-2 outline-none text-white appearance-none cursor-pointer ${className}`}
        >
          <option value="">Select an option</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </motion.div>
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-red-400"
        >
          {error}
        </motion.p>
      )}
    </motion.div>
  );
}
