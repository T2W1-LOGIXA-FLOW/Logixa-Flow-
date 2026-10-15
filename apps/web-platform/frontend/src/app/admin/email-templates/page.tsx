"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "@/components/shadcn/Button";
import { adminFetch } from "@/components/api";
import { getAdminSessionToken } from "@/lib/adminSession";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  template_html: string;
  is_active: boolean;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unable to load email templates.";
}

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState("");

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = await getAdminSessionToken();
      if (!token) throw new Error("Admin session is required");
      const response = await adminFetch("/api/admin/email-templates", token);
      const data = (await response.json()) as EmailTemplate[];
      setTemplates(data);
      setSelectedTemplate((current) =>
        current ? data.find((template) => template.id === current.id) ?? null : null
      );
    } catch (requestError) {
      setTemplates([]);
      setSelectedTemplate(null);
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTemplates();
  }, [fetchTemplates]);

  const handleSaveTemplate = async (template: EmailTemplate) => {
    setError("");
    try {
      const token = await getAdminSessionToken();
      if (!token) throw new Error("Admin session is required");
      const response = await adminFetch(
        `/api/admin/email-templates/${encodeURIComponent(template.id)}`,
        token,
        {
          method: "PATCH",
          body: JSON.stringify({
            subject: template.subject,
            template_html: template.template_html,
            is_active: template.is_active,
          }),
        }
      );
      const updated = (await response.json()) as EmailTemplate;
      setTemplates((current) =>
        current.map((item) => (item.id === updated.id ? updated : item))
      );
      setSelectedTemplate(updated);
      setIsEditing(false);
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-8 text-slate-100">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-8 bg-gradient-to-r from-cyan-500 to-orange-500 bg-clip-text text-4xl font-bold text-transparent">
          Email Templates
        </h1>

        {error && (
          <div role="alert" className="mb-6 rounded-lg border border-red-500/30 bg-red-950/40 p-4 text-red-300">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="overflow-hidden rounded-lg border border-slate-700 bg-slate-900/50">
            {loading ? (
              <div className="p-6 text-center text-slate-400">Loading email templates...</div>
            ) : error ? null : templates.length === 0 ? (
              <div className="p-6 text-center text-slate-400">No email templates found.</div>
            ) : (
              <div className="divide-y divide-slate-700">
                {templates.map((template) => (
                  <button
                    type="button"
                    key={template.id}
                    onClick={() => {
                      setSelectedTemplate(template);
                      setIsEditing(false);
                    }}
                    className={`w-full p-4 text-left transition-colors ${
                      selectedTemplate?.id === template.id ? "bg-slate-800" : "hover:bg-slate-800/50"
                    }`}
                  >
                    <span className="block font-semibold text-white">{template.name}</span>
                    <span className="mt-1 block text-xs text-slate-400">Subject: {template.subject}</span>
                    <span className="mt-2 inline-block rounded bg-slate-700 px-2 py-1 text-xs text-slate-300">
                      {template.is_active ? "Active" : "Inactive"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedTemplate && !error && (
            <div className="lg:col-span-2 rounded-lg border border-slate-700 bg-slate-900/50 p-6">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold">{selectedTemplate.name}</h2>
                <Button
                  onClick={() => setIsEditing((editing) => !editing)}
                  className="rounded-lg bg-cyan-600 px-4 py-2 text-white hover:bg-cyan-700"
                >
                  {isEditing ? "Cancel" : "Edit"}
                </Button>
              </div>

              {isEditing ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void handleSaveTemplate(selectedTemplate);
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label htmlFor="template-subject" className="mb-2 block text-sm font-medium">Subject</label>
                    <input
                      id="template-subject"
                      type="text"
                      value={selectedTemplate.subject}
                      onChange={(event) =>
                        setSelectedTemplate({ ...selectedTemplate, subject: event.target.value })
                      }
                      className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="template-html" className="mb-2 block text-sm font-medium">HTML Template</label>
                    <textarea
                      id="template-html"
                      value={selectedTemplate.template_html}
                      onChange={(event) =>
                        setSelectedTemplate({ ...selectedTemplate, template_html: event.target.value })
                      }
                      rows={12}
                      className="w-full resize-none rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 font-mono text-sm text-white"
                    />
                  </div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedTemplate.is_active}
                      onChange={(event) =>
                        setSelectedTemplate({ ...selectedTemplate, is_active: event.target.checked })
                      }
                      className="h-4 w-4"
                    />
                    <span>Active</span>
                  </label>
                  <Button type="submit" className="w-full rounded-lg bg-green-600 py-2 text-white hover:bg-green-700">
                    Save Changes
                  </Button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-slate-400">Subject</p>
                    <p className="font-semibold">{selectedTemplate.subject}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Template HTML</p>
                    <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-slate-700 bg-slate-800/50 p-4 font-mono text-sm text-slate-300">
                      {selectedTemplate.template_html}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
