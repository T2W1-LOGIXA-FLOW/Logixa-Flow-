import styles from "@/app/admin/admin-theme.module.css";

type StatusTone = "success" | "cyan" | "violet" | "warning" | "danger";

export default function AdminStatusBadge({
  label,
  tone = "cyan",
  pulse = false,
}: {
  label: string;
  tone?: StatusTone;
  pulse?: boolean;
}) {
  return (
    <span className={`${styles.statusBadge} ${styles[tone]}`} aria-label={label}>
      <span className={`${styles.statusDot} ${pulse ? "animate-pulse" : ""}`} aria-hidden="true" />
      {label}
    </span>
  );
}
