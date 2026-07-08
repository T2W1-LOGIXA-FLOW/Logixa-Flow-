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
    if (!t && typeof window !== "undefined") {
      setT(getAdminSessionToken());
    }
  }, [t]);

  const [emailTo, setEmailTo] = useState("");
  const [emailSub, setEmailSub] = useState("Test from Logixa Flow");
  const [pdfSlug, setPdfSlug] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
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

  async function triggerPDF() {
    if (!t) {
      toast.error("Missing admin token");
      return;
    }
    if (!pdfSlug.trim()) {
      toast.error("Provide post slug to export as PDF");
      return;
    }
    setLoading(true);
    try {
      const resp = await adminFetch(`/api/admin/integration/trigger-pdf`, t, {
        method: "POST",
        body: JSON.stringify({ slug: pdfSlug.trim() }),
      });
      const res = await resp.json();
      toast.success(res?.message || "PDF generation queued");
    } catch (e) {
      console.error(e);
      toast.error("PDF trigger failed");
    } finally {
      setLoading(false);
    }
  }

  async function triggerWebhook() {
    if (!t) {
      toast.error("Missing admin token");
      return;
    }
    if (!webhookUrl.trim()) {
      toast.error("Provide webhook URL");
      return;
    }
    setLoading(true);
    try {
      const resp = await adminFetch(`/api/admin/integration/trigger-webhook`, t, {
        method: "POST",
        body: JSON.stringify({ url: webhookUrl.trim() }),
      });
      const res = await resp.json();
      toast.success(res?.message || "Webhook fired");
    } catch (e) {
      console.error(e);
      toast.error("Webhook trigger failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <p className="eyebrow">Integrations</p>
      <h2>Email, PDF export, and Webhook triggers</h2>
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm">Post Slug for PDF</label>
            <Input value={pdfSlug} onChange={(e) => setPdfSlug((e.target as HTMLInputElement).value)} placeholder="post-slug" />
          </div>
          <div className="col-span-2 flex items-end">
            <Button variant="ghost" onClick={triggerPDF} disabled={loading}>
              {loading ? "Queuing..." : "Generate PDF"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm">Webhook URL</label>
            <Input value={webhookUrl} onChange={(e) => setWebhookUrl((e.target as HTMLInputElement).value)} placeholder="https://example.com/hook" />
          </div>
          <div className="col-span-2 flex items-end">
            <Button variant="destructive" onClick={triggerWebhook} disabled={loading}>
              {loading ? "Firing..." : "Send Webhook"}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
