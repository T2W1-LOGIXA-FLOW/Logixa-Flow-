import styles from "@/app/admin/admin-theme.module.css";

export default function AdminCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <section className={`${styles.card} ${className}`}>{children}</section>;
}
