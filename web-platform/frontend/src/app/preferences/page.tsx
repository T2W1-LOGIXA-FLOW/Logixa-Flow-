'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLocale } from '@/lib/LanguageContext';
import { toast } from 'sonner';
import Footer7 from '@/components/ui/footer-7';
import PageBackground from '@/components/PageBackground';

interface Preferences {
  notifications: boolean;
  emailSubscribe: boolean;
  darkMode: boolean;
}

export default function PreferencesPage() {
  const { locale, setLocale } = useLocale();
  type SupportedLocale = Parameters<typeof setLocale>[0];
  const supportedLocales: SupportedLocale[] = ['en', 'mm'];
  const [prefs, setPrefs] = useState<Preferences>({
    notifications: true,
    emailSubscribe: true,
    darkMode: true,
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Load preferences from localStorage
    const saved = localStorage.getItem('userPreferences');
    if (saved) {
      setPrefs(JSON.parse(saved));
    }
    setMounted(true);
  }, []);

  const handleToggle = (key: keyof Preferences) => {
    const newPrefs = { ...prefs, [key]: !prefs[key] };
    setPrefs(newPrefs);
    localStorage.setItem('userPreferences', JSON.stringify(newPrefs));
    toast.success('Preference updated!');
  };

  const handleLanguageChange = (newLocale: SupportedLocale) => {
    setLocale(newLocale);
    toast.success(`Language changed to ${newLocale}`);
  };

  const handleReset = () => {
    localStorage.removeItem('userPreferences');
    localStorage.removeItem('theme');
    setPrefs({
      notifications: true,
      emailSubscribe: true,
      darkMode: true,
    });
    toast.success('All preferences reset to defaults');
  };

  if (!mounted) return null;

  return (
    <PageBackground overlayOpacity={0.85}>
      <main className="min-h-screen py-20">
      <div className="mx-auto max-w-4xl px-4 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 to-orange-400 bg-clip-text text-transparent">
            Preferences
          </h1>
          <p className="text-slate-400 mt-2">Customize your experience</p>
        </motion.div>

        {/* Notification Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          className="logixa-card border border-slate-700 rounded-lg p-6 mb-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold">🔔 Notifications</h2>
              <p className="text-sm text-slate-400 mt-1">Receive in-app notifications about new content and updates</p>
            </div>
            <motion.button
              onClick={() => handleToggle('notifications')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`relative w-12 h-6 rounded-full transition ${
                prefs.notifications ? 'bg-cyan-500' : 'bg-slate-700'
              }`}
            >
              <motion.div
                animate={{ x: prefs.notifications ? 24 : 2 }}
                className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full"
              />
            </motion.button>
          </div>
          <p className="text-xs text-slate-500">Status: {prefs.notifications ? '✓ Enabled' : '✗ Disabled'}</p>
        </motion.div>

        {/* Email Subscription */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="logixa-card border border-slate-700 rounded-lg p-6 mb-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold">📧 Email Subscription</h2>
              <p className="text-sm text-slate-400 mt-1">Receive weekly digests of new insights</p>
            </div>
            <motion.button
              onClick={() => handleToggle('emailSubscribe')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`relative w-12 h-6 rounded-full transition ${
                prefs.emailSubscribe ? 'bg-cyan-500' : 'bg-slate-700'
              }`}
            >
              <motion.div
                animate={{ x: prefs.emailSubscribe ? 24 : 2 }}
                className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full"
              />
            </motion.button>
          </div>
          <p className="text-xs text-slate-500">Status: {prefs.emailSubscribe ? '✓ Enabled' : '✗ Disabled'}</p>
        </motion.div>

        {/* Language Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="logixa-card border border-slate-700 rounded-lg p-6 mb-6"
        >
          <h2 className="text-xl font-semibold mb-4">🌐 Language</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {supportedLocales.map(lang => (
              <motion.button
                key={lang}
                onClick={() => handleLanguageChange(lang)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`py-2 px-4 rounded-lg font-medium transition ${
                  locale === lang
                    ? 'bg-cyan-500/20 border border-cyan-500 text-cyan-300'
                    : 'bg-slate-800/50 border border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                {lang === 'en' ? 'English' : ' မြန်မာ'}
              </motion.button>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-3">Current: {locale === 'en' ? 'English' : ' Myanmar'}</p>
        </motion.div>

        {/* Dark Mode Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="logixa-card border border-slate-700 rounded-lg p-6 mb-6"
        >
          <h2 className="text-xl font-semibold mb-4">🌙 Theme</h2>
          <p className="text-sm text-slate-400 mb-3">Currently using dark theme</p>
          <p className="text-xs text-slate-500">Note: Theme toggle is available in the header</p>
        </motion.div>

        {/* Reset Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex gap-4"
        >
          <motion.button
            onClick={handleReset}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-6 py-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg hover:bg-red-500/20 transition font-medium"
          >
            Reset All Preferences
          </motion.button>
        </motion.div>
      </div>
    </main>
    <Footer7 />
    </PageBackground>
  );
}
