"use client";

import { useState } from "react";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState({
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
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-cyan-500 to-orange-500 bg-clip-text text-transparent">
          Admin Settings
        </h1>

        {saved && (
          <div className="mb-6 p-4 bg-green-900/30 border border-green-500 rounded-lg text-green-400">
            Beta settings saved locally in this browser.
          </div>
        )}
        <div className="mb-6 p-4 bg-yellow-900/30 border border-yellow-500 rounded-lg text-yellow-200 text-sm">
          Beta preview: these settings are local-only until a backend settings API is connected.
        </div>

        <form className="space-y-8">
          {/* Site Settings */}
          <section className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Site Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Site Name</label>
                <input
                  type="text"
                  value={settings.siteName}
                  onChange={(e) =>
                    setSettings({ ...settings, siteName: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Site Description</label>
                <textarea
                  value={settings.siteDescription}
                  onChange={(e) =>
                    setSettings({ ...settings, siteDescription: e.target.value })
                  }
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>
            </div>
          </section>

          {/* Email Settings */}
          <section className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Email Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Admin Email</label>
                <input
                  type="email"
                  value={settings.adminEmail}
                  onChange={(e) =>
                    setSettings({ ...settings, adminEmail: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Support Email</label>
                <input
                  type="email"
                  value={settings.supportEmail}
                  onChange={(e) =>
                    setSettings({ ...settings, supportEmail: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.enableEmailNotifications}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      enableEmailNotifications: e.target.checked,
                    })
                  }
                  className="w-4 h-4"
                />
                <span>Enable email notifications</span>
              </label>
            </div>
          </section>

          {/* Feature Flags */}
          <section className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Feature Flags</h2>
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.enableAnalytics}
                  onChange={(e) =>
                    setSettings({ ...settings, enableAnalytics: e.target.checked })
                  }
                  className="w-4 h-4"
                />
                <span>Enable Analytics Dashboard</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.enablePayments}
                  onChange={(e) =>
                    setSettings({ ...settings, enablePayments: e.target.checked })
                  }
                  className="w-4 h-4"
                />
                <span>Enable Payment Processing</span>
              </label>
            </div>
          </section>

          {/* Security Settings */}
          <section className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Security Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Rate Limit (requests per hour)
                </label>
                <input
                  type="number"
                  value={settings.rateLimitPerHour}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      rateLimitPerHour: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Session Timeout (minutes)
                </label>
                <input
                  type="number"
                  value={settings.sessionTimeout}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      sessionTimeout: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </section>

          {/* Danger Zone */}
          <section className="bg-red-900/20 border border-red-700 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4 text-red-400">Danger Zone</h2>
            <p className="text-slate-300 mb-4">
              These actions cannot be undone. Please use with caution.
            </p>
            <div className="space-y-2">
              <button
                type="button"
                className="w-full py-2 px-4 bg-red-900/30 border border-red-700 text-red-400 rounded-lg hover:bg-red-900/50 transition-all"
              >
                Clear Cache
              </button>
              <button
                type="button"
                className="w-full py-2 px-4 bg-red-900/30 border border-red-700 text-red-400 rounded-lg hover:bg-red-900/50 transition-all"
              >
                Reset Analytics
              </button>
            </div>
          </section>

          {/* Save Button */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-orange-500 text-white rounded-lg font-semibold hover:from-cyan-600 hover:to-orange-600 transition-all"
            >
              Save Settings
            </button>
            <button
              type="button"
              className="flex-1 py-3 bg-slate-800 text-slate-100 rounded-lg font-semibold hover:bg-slate-700 transition-all"
            >
              Reset to Defaults
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
