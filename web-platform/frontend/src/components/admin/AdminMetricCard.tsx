import styles from "@/app/admin/admin-theme.module.css";
import AdminCard from "./AdminCard";

export default function AdminMetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: React.ReactNode;
  detail?: string;
}) {
  return (
    <AdminCard className={styles.metricCard}>
      <span className={styles.metricLabel}>{label}</span>
      <strong className={styles.metricValue}>{value}</strong>
      {detail ? <span className="mt-1 block text-xs text-slate-500">{detail}</span> : null}
    </AdminCard>
  );
}
