export default function TwoFactorAuthPage() {
  return (
    <main className="min-h-screen py-20">
      <div className="mx-auto max-w-2xl px-4 lg:px-8">
        <div className="logixa-card rounded-lg border border-slate-700 p-8">
          <h1 className="text-3xl font-bold">Two-Factor Authentication</h1>
          <p className="mt-4 text-slate-400">
            Two-factor authentication is not enabled yet. This screen does not
            generate, verify, or store authentication secrets.
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Production 2FA will be available only after server-side enrollment,
            TOTP verification, recovery-code storage, session enforcement, and
            revocation are implemented.
          </p>
        </div>
      </div>
    </main>
  );
}
