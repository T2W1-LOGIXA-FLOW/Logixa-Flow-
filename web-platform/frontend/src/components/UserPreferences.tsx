"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { PremiumButton } from "./PremiumInputs";
import { PremiumAlert } from "./PremiumUIComponents";

interface UserPreferences {
  theme: "light" | "dark" | "auto";
  language: "en" | "my";
  notifications: {
    email: boolean;
    push: boolean;
    newsletter: boolean;
  };
  colorScheme: "cyan-orange" | "blue-purple" | "green-teal" | "red-pink";
  compactMode: boolean;
  animationsEnabled: boolean;
  sidebarCollapsed: boolean;
}

const defaultPreferences: UserPreferences = {
  theme: "dark",
  language: "en",
  notifications: {
    email: true,
    push: false,
    newsletter: true,
  },
  colorScheme: "cyan-orange",
  compactMode: false,
  animationsEnabled: true,
  sidebarCollapsed: false,
};

export function UserPreferencesPanel() {
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [isSaved, setIsSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<"appearance" | "notifications" | "privacy">("appearance");

  useEffect(() => {
    // Load preferences from localStorage
    const saved = localStorage.getItem("userPreferences");
    if (saved) {
      setPreferences(JSON.parse(saved));
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem("userPreferences", JSON.stringify(preferences));
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleReset = () => {
    setPreferences(defaultPreferences);
    localStorage.removeItem("userPreferences");
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-700">
        {(["appearance", "notifications", "privacy"] as const).map((tab) => (
          <motion.button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 font-semibold capitalize relative ${
              activeTab === tab ? "text-cyan-400" : "text-slate-400 hover:text-white"
            }`}
          >
            {tab}
            {activeTab === tab && (
              <motion.div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-orange-500" />
            )}
          </motion.button>
        ))}
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Appearance Tab */}
        {activeTab === "appearance" && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-3">Theme</label>
              <div className="grid grid-cols-3 gap-3">
                {["light", "dark", "auto"].map((theme) => (
                  <motion.button
                    key={theme}
                    whileHover={{ scale: 1.05 }}
                    onClick={() => setPreferences({ ...preferences, theme: theme as UserPreferences["theme"] })}
                    className={`p-4 rounded-lg capitalize font-semibold transition-all ${
                      preferences.theme === theme
                        ? "bg-cyan-500/20 border-2 border-cyan-500 text-cyan-300"
                        : "bg-slate-800 border-2 border-slate-700 text-slate-300 hover:border-slate-600"
                    }`}
                  >
                    {theme === "auto" ? "🔄 Auto" : theme === "dark" ? "🌙 Dark" : "☀️ Light"}
                  </motion.button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-3">Color Scheme</label>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { value: "cyan-orange", label: "Cyan-Orange", colors: "from-cyan-500 to-orange-500" },
                  { value: "blue-purple", label: "Blue-Purple", colors: "from-blue-500 to-purple-500" },
                  { value: "green-teal", label: "Green-Teal", colors: "from-green-500 to-teal-500" },
                  { value: "red-pink", label: "Red-Pink", colors: "from-red-500 to-pink-500" },
                ] as const).map((scheme) => (
                  <motion.button
                    key={scheme.value}
                    whileHover={{ scale: 1.05 }}
                    onClick={() => setPreferences({ ...preferences, colorScheme: scheme.value })}
                    className={`p-4 rounded-lg font-semibold transition-all ${
                      preferences.colorScheme === scheme.value ? "ring-2 ring-offset-2 ring-offset-slate-900 ring-cyan-500" : ""
                    }`}
                  >
                    <div className={`h-8 rounded bg-gradient-to-r ${scheme.colors}`} />
                    <span className="text-xs mt-2 block text-slate-300">{scheme.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.compactMode}
                  onChange={(e) => setPreferences({ ...preferences, compactMode: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-slate-300">Compact Mode</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.animationsEnabled}
                  onChange={(e) => setPreferences({ ...preferences, animationsEnabled: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-slate-300">Enable Animations</span>
              </label>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === "notifications" && (
          <div className="space-y-6">
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors">
                <input
                  type="checkbox"
                  checked={preferences.notifications.email}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      notifications: { ...preferences.notifications, email: e.target.checked },
                    })
                  }
                  className="w-4 h-4"
                />
                <div>
                  <div className="font-semibold text-white">Email Notifications</div>
                  <div className="text-sm text-slate-400">Receive updates via email</div>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors">
                <input
                  type="checkbox"
                  checked={preferences.notifications.push}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      notifications: { ...preferences.notifications, push: e.target.checked },
                    })
                  }
                  className="w-4 h-4"
                />
                <div>
                  <div className="font-semibold text-white">Push Notifications</div>
                  <div className="text-sm text-slate-400">Get instant browser alerts</div>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors">
                <input
                  type="checkbox"
                  checked={preferences.notifications.newsletter}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      notifications: { ...preferences.notifications, newsletter: e.target.checked },
                    })
                  }
                  className="w-4 h-4"
                />
                <div>
                  <div className="font-semibold text-white">Newsletter</div>
                  <div className="text-sm text-slate-400">Weekly digest of insights</div>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Privacy Tab */}
        {activeTab === "privacy" && (
          <div className="space-y-6">
            <div className="logixa-card p-6 space-y-4">
              <h3 className="font-semibold text-white">Data & Privacy</h3>
              <p className="text-sm text-slate-400">Your data is encrypted and never shared with third parties.</p>
              <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors">
                Download My Data
              </button>
              <button className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors">
                Delete Account
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Success Alert */}
      {isSaved && (
        <PremiumAlert
          type="success"
          title="Saved!"
          message="Your preferences have been saved successfully."
          dismissible={true}
        />
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-slate-700">
        <PremiumButton onClick={handleSave} variant="primary" className="flex-1">
          Save Changes
        </PremiumButton>
        <PremiumButton onClick={handleReset} variant="outline" className="flex-1">
          Reset to Default
        </PremiumButton>
      </div>
    </div>
  );
}
