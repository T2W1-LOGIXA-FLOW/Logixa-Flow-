"use client";

import React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  href?: string;
  variant?: "primary" | "ghost" | "destructive" | "default";
  className?: string;
};

export default function Button({ href, variant = "default", className = "", children, ...rest }: ButtonProps) {
  const base = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";
  const variants: Record<string, string> = {
    primary: "bg-primary text-white hover:bg-primary/90",
    ghost: "bg-transparent border border-input hover:bg-accent/5",
    destructive: "bg-destructive text-white hover:bg-destructive/90",
    default: "bg-muted text-foreground",
  };
  const cls = `${base} ${variants[variant]} ${className}`;

  if (href) {
    const anchorProps = rest as React.AnchorHTMLAttributes<HTMLAnchorElement>;
    return (
      <a href={href} className={cls} {...anchorProps}>
        {children}
      </a>
    );
  }

  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  );
}
