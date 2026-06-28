"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function useAdminAuth() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("adminToken") || localStorage.getItem("logixa_token");
    if (!saved) {
      router.push("/admin/login");
      return;
    }
    setToken(saved);
    setIsAuthenticated(true);
  }, [router]);

  return { token, isAuthenticated };
}
