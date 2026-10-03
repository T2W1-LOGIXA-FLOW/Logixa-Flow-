"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import Button from "./shadcn/Button";
import Input from "./shadcn/Input";
import Card from "./shadcn/Card";
import { adminFetch } from "./api";
import { getAdminSessionToken } from "@/lib/adminSession";

export default function IntegrationTriggers({ token }: { token?: string }) {
  const [t, setT] = useState<string | null>(token || null);
  useEffect(() => {
    if (t) return;
    let cancelled = false;
    getAdminSessionToken().then((sessionToken) => {
      if (!cancelled) setT(sessionToken);
    });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const [emailTo, setEmailTo] = useState("");
  const [emailSub, setEmailSub] = useState("Test from Logixa Flow");
  const [loading, setLoading] = useState(false);

  async function triggerEmail() {
    if (!t) {
      toast.error("Missing admin token");
      return;
    }
    setLoading(true);
    try {
      const resp = await adminFetch("/api/admin/integration/trigger-email", t, {
        method: "POST",
        body: JSON.stringify({ to: emailTo, subject: emailSub }),
      });
      const res = await resp.json();
      toast.success(res?.message || "Email queued");
    } catch (e) {
      console.error(e);
      toast.error("Email trigger failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <p className="eyebrow">Integrations</p>
      <h2>Email trigger</h2>
      <div className="space-y-4 mt-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm">Test Email To</label>
            <Input value={emailTo} onChange={(e) => setEmailTo((e.target as HTMLInputElement).value)} placeholder="recipient@example.com" />
          </div>
          <div>
            <label className="block text-sm">Subject</label>
            <Input value={emailSub} onChange={(e) => setEmailSub((e.target as HTMLInputElement).value)} />
          </div>
          <div className="flex items-end">
            <Button variant="primary" onClick={triggerEmail} disabled={loading}>
              {loading ? "Sending..." : "Send Test Email"}
            </Button>
          </div>
        </div>

        <p className="text-sm text-slate-400">
          PDF export and webhook delivery are unavailable because no backend implementation is currently enabled.
        </p>
      </div>
    </Card>
  );
}
