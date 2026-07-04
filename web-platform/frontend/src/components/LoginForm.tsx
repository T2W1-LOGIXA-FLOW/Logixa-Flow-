"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { login } from "./api";
import { useLocale } from "@/lib/LanguageContext";
import { setAdminSession } from "@/lib/adminSession";
import Skeleton from "./shadcn/Skeleton";
import LivingLogo from "./LivingLogo";

export default function LoginForm() {
  const router = useRouter();
  const { t } = useLocale();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(event.currentTarget);
    try {
      const result = await login(String(form.get("username")), String(form.get("password")));
      localStorage.setItem("adminToken", result.access_token);
      localStorage.setItem("logixa_token", result.access_token);
      setAdminSession(result.access_token);
      router.push("/admin");
    } catch {
      const translation = t("loginError");
      const message = typeof translation === "string" ? translation : translation.join(" ");
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="login-panel" onSubmit={onSubmit}>
      <div className="flex justify-center mb-6">
        <LivingLogo size={120} />
      </div>
      <div className="text-center mb-8">
        <p className="eyebrow">Secure Admin</p>
        <h1 className="text-3xl font-bold text-white mt-2">Logixa Flow</h1>
        <p className="text-slate-400 text-sm mt-2">Admin Control Center</p>
      </div>
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      ) : (
        <>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input 
              name="username" 
              defaultValue="admin" 
              required 
              className="form-input"
              placeholder="Enter username"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input 
              name="password" 
              type="password" 
              required 
              className="form-input"
              placeholder="Enter password"
            />
          </div>
          <button className="primary-button w-full" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </button>
        </>
      )}
      {error && (
        <div className="admin-status error mt-4">
          {error}
        </div>
      )}
    </form>
  );
}
