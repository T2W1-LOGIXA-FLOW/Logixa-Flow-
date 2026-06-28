"use client";

import React from "react";

export default function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return <input className={`border rounded px-3 py-2 text-sm ${className}`} {...rest} />;
}
