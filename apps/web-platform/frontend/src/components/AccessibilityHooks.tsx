"use client";

import { useEffect, useState, useRef, ReactNode } from "react";

/**
 * Keyboard Navigation Hook
 * Provides keyboard navigation for interactive components
 */
export function useKeyboardNavigation(items: number) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((prev) => (prev + 1) % items);
          break;
        case "ArrowLeft":
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((prev) => (prev - 1 + items) % items);
          break;
        case "Home":
          e.preventDefault();
          setActiveIndex(0);
          break;
        case "End":
          e.preventDefault();
          setActiveIndex(items - 1);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [items]);

  return activeIndex;
}

/**
 * Focus Management Hook
 * Manages focus trap for modals and dialogs
 */
export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      const focusableElements = containerRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      if (!focusableElements || focusableElements.length === 0) return;

      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
      const activeElement = document.activeElement;

      if (e.shiftKey) {
        if (activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    const container = containerRef.current;
    container.addEventListener("keydown", handleKeyDown);
    return () => container.removeEventListener("keydown", handleKeyDown);
  }, [isActive]);

  return containerRef;
}

/**
 * Announce Changes Hook
 * Announces changes to screen readers
 */
export function useAnnounce() {
  const [announcement, setAnnouncement] = useState("");

  const announce = (message: string, priority: "polite" | "assertive" = "polite") => {
    void priority;
    setAnnouncement("");
    setTimeout(() => {
      setAnnouncement(message);
    }, 100);
  };

  return { announce, announcement };
}

/**
 * Accessible Live Region Component
 * For screen reader announcements
 */
export function AccessibleLiveRegion({
  message,
  priority = "polite",
}: {
  message: string;
  priority?: "polite" | "assertive";
}) {
  return (
    <div
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}

/**
 * Accessible Button with Focus Management
 */
export function AccessibleButton({
  children,
  onClick,
  ariaLabel,
  ariaPressed,
  ariaExpanded,
  className = "",
  ...props
}: {
  children: ReactNode;
  onClick?: () => void;
  ariaLabel?: string;
  ariaPressed?: boolean;
  ariaExpanded?: boolean;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      aria-expanded={ariaExpanded}
      className={`
        focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 
        focus:ring-offset-slate-900 rounded-lg transition-all
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * Accessible Link Component
 */
export function AccessibleLink({
  href,
  children,
  ariaLabel,
  isCurrent = false,
  className = "",
  ...props
}: {
  href: string;
  children: ReactNode;
  ariaLabel?: string;
  isCurrent?: boolean;
  className?: string;
} & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      href={href}
      aria-label={ariaLabel}
      aria-current={isCurrent ? "page" : undefined}
      className={`
        focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 
        focus:ring-offset-slate-900 rounded transition-all
        ${className}
      `}
      {...props}
    >
      {children}
    </a>
  );
}

/**
 * Accessible Form Field Component
 */
export function AccessibleFormField({
  label,
  id,
  error,
  required,
  children,
  helperText,
}: {
  label: string;
  id: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  helperText?: string;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block font-semibold text-slate-300">
        {label}
        {required && <span aria-label="required" className="text-red-400 ml-1">*</span>}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
      {helperText && (
        <p id={`${id}-helper`} className="text-sm text-slate-400">
          {helperText}
        </p>
      )}
    </div>
  );
}

/**
 * Skip to Main Content Link
 * For keyboard navigation accessibility
 */
export function SkipToMainContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only fixed top-2 left-2 z-50 bg-cyan-600 text-white px-4 py-2 rounded"
    >
      Skip to main content
    </a>
  );
}

/**
 * Reduction of Motion Hook
 * Respects user's motion preferences
 */
export function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return prefersReducedMotion;
}

/**
 * High Contrast Mode Detection Hook
 */
export function useHighContrastMode() {
  const [highContrastMode, setHighContrastMode] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-contrast: more)");
    setHighContrastMode(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setHighContrastMode(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return highContrastMode;
}
