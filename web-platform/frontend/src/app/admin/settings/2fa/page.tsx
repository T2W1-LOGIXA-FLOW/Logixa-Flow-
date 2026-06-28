'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function TwoFactorAuthPage() {
  const [step, setStep] = useState<'setup' | 'verify' | 'complete'>('setup');
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  // Beta preview data. Production 2FA must be generated and verified server-side.
  const betaQRSecret = 'JBSWY3DPEBLW64TMMQ4XEOLN';
  const betaQRUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=otpauth://totp/LogixaFlow:admin@logixa.flow?secret=${betaQRSecret}&issuer=LogixaFlow`;

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    setIsVerifying(true);
    
    // Simulate API call
    setTimeout(() => {
      // Beta verification only. Production must verify against the backend.
      if (verificationCode === '123456') {
        const codes = [
          'LOGIXA-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
          'LOGIXA-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
          'LOGIXA-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
          'LOGIXA-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
          'LOGIXA-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
        ];
        setBackupCodes(codes);
        setStep('complete');
        toast.success('2FA successfully enabled!');
      } else {
        toast.error('Invalid beta code. For preview only, use 123456');
      }
      setIsVerifying(false);
    }, 1000);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Backup code copied!');
  };

  const handleDownloadCodes = () => {
    const text = backupCodes.join('\n');
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', 'logixa-flow-backup-codes.txt');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success('Backup codes downloaded!');
  };

  return (
    <main className="min-h-screen py-20">
      <div className="mx-auto max-w-2xl px-4 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 to-orange-400 bg-clip-text text-transparent">
            Two-Factor Authentication
          </h1>
          <p className="text-slate-400 mt-2">Beta preview only. Production 2FA is not enabled from this screen yet.</p>
        </motion.div>

        {/* Setup Step */}
        {step === 'setup' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Step 1 */}
            <div className="logixa-card border border-slate-700 rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-sm">1</span>
                Download Authenticator App
              </h2>
              <p className="text-slate-400 mb-4">
                Install an authenticator app on your phone:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <a
                  href="https://apps.apple.com/app/google-authenticator/id388497605"
                  target="_blank"
                  rel="noreferrer"
                  className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg hover:border-cyan-500 transition text-center text-sm"
                >
                  📱 Google Authenticator
                </a>
                <a
                  href="https://apps.apple.com/app/microsoft-authenticator/id981333031"
                  target="_blank"
                  rel="noreferrer"
                  className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg hover:border-cyan-500 transition text-center text-sm"
                >
                  📱 Microsoft Authenticator
                </a>
                <a
                  href="https://authy.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg hover:border-cyan-500 transition text-center text-sm"
                >
                  📱 Authy
                </a>
              </div>
            </div>

            {/* Step 2 */}
            <div className="logixa-card border border-slate-700 rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-sm">2</span>
                Scan QR Code
              </h2>
              <p className="text-slate-400 mb-4">
                Scan this beta QR code only for local testing:
              </p>
              <div className="bg-white p-4 rounded-lg w-fit mx-auto">
                <Image src={betaQRUrl} alt="2FA QR Code" width={192} height={192} />
              </div>
              <p className="text-slate-500 text-xs text-center mt-4">
                Can&apos;t scan? Enter code manually: <code className="bg-slate-800 px-2 py-1 rounded">{betaQRSecret}</code>
              </p>
            </div>

            {/* Step 3 */}
            <div className="logixa-card border border-slate-700 rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-sm">3</span>
                Verify Code
              </h2>
              <p className="text-slate-400 mb-4">
                Enter the 6-digit code from your authenticator:
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  className="flex-1 px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-center text-2xl tracking-widest font-mono focus:outline-none focus:border-cyan-500"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleVerifyCode}
                  disabled={isVerifying || verificationCode.length !== 6}
                  className="px-6 py-2 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-lg hover:bg-cyan-500/20 transition disabled:opacity-50"
                >
                {isVerifying ? 'Verifying...' : 'Verify beta code'}
                </motion.button>
              </div>
              <p className="text-xs text-slate-500 mt-2">Beta demo: use code 123456. Do not use for production security.</p>
            </div>
          </motion.div>
        )}

        {/* Verification Success */}
        {step === 'complete' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="logixa-card border border-green-500/30 bg-green-500/5 rounded-lg p-8 text-center">
              <div className="text-5xl mb-4">✓</div>
              <h2 className="text-2xl font-bold text-green-400 mb-2">Beta 2FA Flow Complete</h2>
              <p className="text-slate-400">This confirms the preview flow only. Production 2FA still needs backend verification.</p>
            </div>

            {/* Backup Codes */}
            <div className="logixa-card border border-slate-700 rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                🔐 Backup Codes
              </h2>
              <p className="text-slate-400 mb-4 text-sm">
                Save these codes in a safe place. Each code can be used once if you lose access to your authenticator.
              </p>
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 mb-4 space-y-2 font-mono text-sm">
                {backupCodes.map((code, idx) => (
                  <motion.div
                    key={idx}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => handleCopyCode(code)}
                    className="flex items-center justify-between p-2 bg-slate-900/50 rounded cursor-pointer hover:bg-slate-900 transition group"
                  >
                    <span className="text-cyan-400">{code}</span>
                    <span className="text-slate-500 group-hover:text-cyan-400 transition">📋</span>
                  </motion.div>
                ))}
              </div>
              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleDownloadCodes}
                  className="flex-1 px-4 py-2 bg-orange-500/10 border border-orange-500/30 text-orange-400 rounded-lg hover:bg-orange-500/20 transition"
                >
                  📥 Download Codes
                </motion.button>
              </div>
            </div>

            {/* Next Steps */}
            <div className="logixa-card border border-slate-700 rounded-lg p-6">
              <h3 className="font-semibold mb-3">Next Steps:</h3>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>✓ Save your backup codes securely</li>
                <li>✓ Use your authenticator app to log in next time</li>
                <li>✓ Never share your authenticator or backup codes</li>
              </ul>
            </div>
          </motion.div>
        )}
      </div>
    </main>
  );
}
