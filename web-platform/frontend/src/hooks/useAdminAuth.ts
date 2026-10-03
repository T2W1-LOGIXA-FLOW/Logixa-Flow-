"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { validateAdminToken } from "@/components/api";
import { clearAdminSession, getAdminSessionToken } from "@/lib/adminSession";

export function useAdminAuth() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      const saved = getAdminSessionToken();
      if (!saved) {
        if (cancelled) return;
        setIsCheckingAuth(false);
        router.push("/admin/login");
        return;
      }
      const valid = await validateAdminToken(saved);
      if (cancelled) return;
      if (!valid) {
        clearAdminSession();
        setToken("");
        setIsAuthenticated(false);
        setIsCheckingAuth(false);
        router.push("/admin/login");
        return;
      }
      setToken(saved);
      setIsAuthenticated(true);
      setIsCheckingAuth(false);
    }

    checkSession();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return { token, isAuthenticated, isCheckingAuth };
}
