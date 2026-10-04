export default function AdminPaymentsPage() {
  return (
    <div className="min-h-screen bg-slate-950 p-8 text-slate-100">
      <div className="mx-auto max-w-3xl rounded-lg border border-slate-700 bg-slate-900/50 p-8">
        <h1 className="text-3xl font-bold">Payment Management</h1>
        <p className="mt-4 text-slate-300" role="status">
          Payments are unavailable because a payment-management backend is not configured.
        </p>
      </div>
    </div>
  );
}
