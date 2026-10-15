"use client";

import { useState } from "react";
import { Settings, Mail, Flag, Shield, Trash2 } from "lucide-react";

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<'general'|'email'|'flags'|'security'|'danger'>('general');

  type SettingsType = {
    siteName: string;
    siteDescription: string;
    adminEmail: string;
    supportEmail: string;
    enableEmailNotifications: boolean;
    enableAnalytics: boolean;
    enablePayments: boolean;
    rateLimitPerHour: number;
    sessionTimeout: number;
    logoUrl?: string;
  };

  const [settings, setSettings] = useState<SettingsType>({
    siteName: "Logixa Flow",
    siteDescription: "Professional dashboard and analytics platform",
    adminEmail: "admin@logixaflow.com",
    supportEmail: "support@logixaflow.com",
    enableEmailNotifications: true,
    enableAnalytics: true,
    enablePayments: true,
    rateLimitPerHour: 5,
    sessionTimeout: 30,
  });

  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    localStorage.setItem("logixa_beta_admin_settings", JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="min-h-screen bg-[#0A0F1E] text-[#E2E8F0] p-8">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-1 text-[#E2E8F0]">Control Panel</h1>
            <p className="text-sm text-[#94A3B8]">Centralized admin configuration — organized into clear sections.</p>
            {saved && (
              <div className="mt-3 inline-block rounded-md bg-[#10B981]/10 px-3 py-2 text-sm text-[#10B981]">Settings saved</div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex items-center gap-2">
          <button type="button" onClick={() => setActiveTab('general')} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${activeTab === 'general' ? 'bg-[#22D3EE]/10 text-[#22D3EE] border-l-2 border-[#22D3EE] shadow-[0_0_12px_rgba(34,211,238,0.06)]' : 'text-[#94A3B8] hover:bg-[#101728]'}`}>
            <Settings className="h-4 w-4" />
            General
          </button>
          <button type="button" onClick={() => setActiveTab('email')} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${activeTab === 'email' ? 'bg-[#22D3EE]/10 text-[#22D3EE] border-l-2 border-[#22D3EE] shadow-[0_0_12px_rgba(34,211,238,0.06)]' : 'text-[#94A3B8] hover:bg-[#101728]'}`}>
            <Mail className="h-4 w-4" />
            Email
          </button>
          <button type="button" onClick={() => setActiveTab('flags')} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${activeTab === 'flags' ? 'bg-[#22D3EE]/10 text-[#22D3EE] border-l-2 border-[#22D3EE] shadow-[0_0_12px_rgba(34,211,238,0.06)]' : 'text-[#94A3B8] hover:bg-[#101728]'}`}>
            <Flag className="h-4 w-4" />
            Feature Flags
          </button>
          <button type="button" onClick={() => setActiveTab('security')} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${activeTab === 'security' ? 'bg-[#22D3EE]/10 text-[#22D3EE] border-l-2 border-[#22D3EE] shadow-[0_0_12px_rgba(34,211,238,0.06)]' : 'text-[#94A3B8] hover:bg-[#101728]'}`}>
            <Shield className="h-4 w-4" />
            Security
          </button>
          <button type="button" onClick={() => setActiveTab('danger')} className={`ml-auto flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${activeTab === 'danger' ? 'bg-red-700/10 text-red-400 border-l-2 border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.04)]' : 'text-[#94A3B8] hover:bg-[#101728]'}`}>
            <Trash2 className="h-4 w-4" />
            Danger Zone
          </button>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 gap-6">
          {/* General */}
          {activeTab === 'general' && (
            <section className="bg-[#101728] border border-[#1E293B] rounded-xl p-6">
              <h2 className="text-lg font-bold text-[#E2E8F0] mb-2 flex items-center gap-3"><Settings className="h-5 w-5 text-[#22D3EE]" /> General Settings</h2>
              <p className="text-sm text-[#94A3B8] mb-4">Site identity and basic configuration.</p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-2 text-[#94A3B8]">Site Name</label>
                  <input value={settings.siteName} onChange={(e) => setSettings({...settings, siteName: e.target.value})} className="w-full px-4 py-2 bg-[#0A0F1E] border border-[#1E293B] rounded-lg text-[#E2E8F0] focus:outline-none" />
                  <p className="mt-1 text-xs text-[#94A3B8]">Public-facing site title shown in headers and emails.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-[#94A3B8]">Logo URL</label>
                  <input value={settings.logoUrl || ''} onChange={(e) => setSettings({...settings, logoUrl: e.target.value})} className="w-full px-4 py-2 bg-[#0A0F1E] border border-[#1E293B] rounded-lg text-[#E2E8F0] focus:outline-none" />
                  <p className="mt-1 text-xs text-[#94A3B8]">Optional: host a logo URL to show in the admin header.</p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2 text-[#94A3B8]">Site Description</label>
                  <textarea value={settings.siteDescription} onChange={(e) => setSettings({...settings, siteDescription: e.target.value})} rows={3} className="w-full px-4 py-2 bg-[#0A0F1E] border border-[#1E293B] rounded-lg text-[#E2E8F0] focus:outline-none resize-none" />
                  <p className="mt-1 text-xs text-[#94A3B8]">A short description used in meta tags and admin summaries.</p>
                </div>
              </div>
            </section>
          )}

          {/* Email */}
          {activeTab === 'email' && (
            <section className="bg-[#101728] border border-[#1E293B] rounded-xl p-6">
              <h2 className="text-lg font-bold text-[#E2E8F0] mb-2 flex items-center gap-3"><Mail className="h-5 w-5 text-[#22D3EE]" /> Email Settings</h2>
              <p className="text-sm text-[#94A3B8] mb-4">Configure admin and support contact addresses and notifications.</p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-2 text-[#94A3B8]">Admin Email</label>
                  <input type="email" value={settings.adminEmail} onChange={(e) => setSettings({...settings, adminEmail: e.target.value})} className="w-full px-4 py-2 bg-[#0A0F1E] border border-[#1E293B] rounded-lg text-[#E2E8F0] focus:outline-none" />
                  <p className="mt-1 text-xs text-[#94A3B8]">Used for administrative alerts and important notifications.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-[#94A3B8]">Support Email</label>
                  <input type="email" value={settings.supportEmail} onChange={(e) => setSettings({...settings, supportEmail: e.target.value})} className="w-full px-4 py-2 bg-[#0A0F1E] border border-[#1E293B] rounded-lg text-[#E2E8F0] focus:outline-none" />
                  <p className="mt-1 text-xs text-[#94A3B8]">Address shown to users for support contact.</p>
                </div>
                <div className="md:col-span-2">
                  <label className="inline-flex items-center gap-3 text-sm text-[#94A3B8]"><input type="checkbox" checked={settings.enableEmailNotifications} onChange={(e) => setSettings({...settings, enableEmailNotifications: e.target.checked})} className="w-4 h-4"/> <span>Enable email notifications</span></label>
                  <p className="mt-1 text-xs text-[#94A3B8]">When enabled, the system will send admin emails for critical events (requires mail service configured).</p>
                </div>
              </div>
            </section>
          )}

          {/* Feature Flags */}
          {activeTab === 'flags' && (
            <section className="bg-[#101728] border border-[#1E293B] rounded-xl p-6">
              <h2 className="text-lg font-bold text-[#E2E8F0] mb-2 flex items-center gap-3"><Flag className="h-5 w-5 text-[#22D3EE]" /> Feature Flags</h2>
              <p className="text-sm text-[#94A3B8] mb-4">Toggle experimental or environment features for admins.</p>
              <div className="space-y-3">
                <label className="inline-flex items-center gap-3 text-sm text-[#94A3B8]"><input type="checkbox" checked={settings.enableAnalytics} onChange={(e) => setSettings({...settings, enableAnalytics: e.target.checked})} className="w-4 h-4"/> <span>Enable Analytics Dashboard</span></label>
                <p className="mt-1 text-xs text-[#94A3B8]">Allow access to analytics pages for admins.</p>
                <label className="inline-flex items-center gap-3 text-sm text-[#94A3B8]"><input type="checkbox" checked={settings.enablePayments} onChange={(e) => setSettings({...settings, enablePayments: e.target.checked})} className="w-4 h-4"/> <span>Enable Payment Processing</span></label>
                <p className="mt-1 text-xs text-[#94A3B8]">Toggle the payments flow for the application.</p>
              </div>
            </section>
          )}

          {/* Security */}
          {activeTab === 'security' && (
            <section className="bg-[#101728] border border-[#1E293B] rounded-xl p-6">
              <h2 className="text-lg font-bold text-[#E2E8F0] mb-2 flex items-center gap-3"><Shield className="h-5 w-5 text-[#22D3EE]" /> Security Settings</h2>
              <p className="text-sm text-[#94A3B8] mb-4">Controls for session and rate-limiting behavior.</p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-2 text-[#94A3B8]">Rate Limit (requests per hour)</label>
                  <input type="number" value={settings.rateLimitPerHour} onChange={(e) => setSettings({...settings, rateLimitPerHour: parseInt(e.target.value)})} className="w-full px-4 py-2 bg-[#0A0F1E] border border-[#1E293B] rounded-lg text-[#E2E8F0] focus:outline-none" />
                  <p className="mt-1 text-xs text-[#94A3B8]">Protect the system by limiting requests per key/IP per hour.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-[#94A3B8]">Session Timeout (minutes)</label>
                  <input type="number" value={settings.sessionTimeout} onChange={(e) => setSettings({...settings, sessionTimeout: parseInt(e.target.value)})} className="w-full px-4 py-2 bg-[#0A0F1E] border border-[#1E293B] rounded-lg text-[#E2E8F0] focus:outline-none" />
                  <p className="mt-1 text-xs text-[#94A3B8]">Number of minutes before an idle admin session expires.</p>
                </div>
              </div>
            </section>
          )}

          {/* Danger */}
          {activeTab === 'danger' && (
            <section className="bg-[#101728] border border-[#1E293B] rounded-xl p-6">
              <h2 className="text-lg font-bold text-red-400 mb-2 flex items-center gap-3"><Trash2 className="h-5 w-5 text-red-400" /> Danger Zone</h2>
              <p className="text-sm text-[#94A3B8] mb-4">Irreversible actions. Use with extreme caution.</p>
              <div className="space-y-3">
                <button type="button" className="w-full py-3 rounded-lg border border-red-700 bg-red-900/10 text-red-400 hover:bg-red-900/20">Clear Cache</button>
                <button type="button" className="w-full py-3 rounded-lg border border-red-700 bg-red-900/10 text-red-400 hover:bg-red-900/20">Reset Analytics</button>
              </div>
            </section>
          )}

          {/* Actions */}
          <div className="flex gap-4 pt-2">
            <button type="button" onClick={handleSave} className="flex-1 py-3 rounded-lg font-semibold text-[#0A0F1E] bg-[#22D3EE] hover:brightness-95 transition-shadow">Save Changes</button>
            <button type="button" onClick={() => setSettings({
              siteName: "Logixa Flow",
              siteDescription: "Professional dashboard and analytics platform",
              adminEmail: "admin@logixaflow.com",
              supportEmail: "support@logixaflow.com",
              enableEmailNotifications: true,
              enableAnalytics: true,
              enablePayments: true,
              rateLimitPerHour: 5,
              sessionTimeout: 30,
            })} className="flex-1 py-3 rounded-lg bg-[#101728] border border-[#1E293B] text-[#94A3B8]">Reset to Defaults</button>
          </div>

        </div>
      </div>
    </div>
  );
}
