"use client";

import { useState, useEffect } from "react";
import Button from "@/components/shadcn/Button";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  template_html: string;
  is_active: boolean;
}

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/email-templates");
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      console.error("Error fetching templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async (template: EmailTemplate) => {
    try {
      const response = await fetch(`/api/admin/email-templates/${template.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(template),
      });

      if (response.ok) {
        setIsEditing(false);
        fetchTemplates();
      }
    } catch (error) {
      console.error("Error saving template:", error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-cyan-500 to-orange-500 bg-clip-text text-transparent">
          Email Templates
        </h1>
        <div className="mb-6 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-200">
          Beta preview: these templates are sample in-memory records. Connect persistent backend storage before production email sending.
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Templates List */}
          <div className="lg:col-span-1">
            <div className="bg-slate-900/50 border border-slate-700 rounded-lg overflow-hidden">
              {loading ? (
                <div className="p-6 text-center text-slate-400">Loading...</div>
              ) : (
                <div className="divide-y divide-slate-700">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      onClick={() => {
                        setSelectedTemplate(template);
                        setIsEditing(false);
                      }}
                      className={`p-4 cursor-pointer transition-colors ${
                        selectedTemplate?.id === template.id ? "bg-slate-800" : "hover:bg-slate-800/50"
                      }`}
                    >
                      <p className="font-semibold text-white">{template.name}</p>
                      <p className="text-xs text-slate-400 mt-1">Subject: {template.subject}</p>
                      <div className="mt-2">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            template.is_active
                              ? "bg-green-900/30 text-green-400"
                              : "bg-slate-700 text-slate-300"
                          }`}
                        >
                          {template.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Template Editor */}
          {selectedTemplate && (
            <div className="lg:col-span-2">
              <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">{selectedTemplate.name}</h2>
                  <Button
                    onClick={() => setIsEditing(!isEditing)}
                    className="bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-700"
                  >
                    {isEditing ? "Cancel" : "Edit"}
                  </Button>
                </div>

                {isEditing ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSaveTemplate(selectedTemplate);
                    }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-sm font-medium mb-2">Subject</label>
                      <input
                        type="text"
                        value={selectedTemplate.subject}
                        onChange={(e) =>
                          setSelectedTemplate({
                            ...selectedTemplate,
                            subject: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">HTML Template</label>
                      <textarea
                        value={selectedTemplate.template_html}
                        onChange={(e) =>
                          setSelectedTemplate({
                            ...selectedTemplate,
                            template_html: e.target.value,
                          })
                        }
                        rows={12}
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-cyan-500 resize-none"
                      />
                    </div>

                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedTemplate.is_active}
                          onChange={(e) =>
                            setSelectedTemplate({
                              ...selectedTemplate,
                              is_active: e.target.checked,
                            })
                          }
                          className="w-4 h-4"
                        />
                        <span>Active</span>
                      </label>
                    </div>

                    <div className="flex gap-4">
                      <Button
                        type="submit"
                        className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
                      >
                        Save Changes
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-slate-400">Subject</p>
                      <p className="font-semibold">{selectedTemplate.subject}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Template HTML</p>
                      <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 mt-2 max-h-96 overflow-auto">
                        <pre className="text-sm text-slate-300 font-mono whitespace-pre-wrap break-words">
                          {selectedTemplate.template_html}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
