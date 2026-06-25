import styles from "./receipt.module.css";

export interface StatRow {
  label: string;
  value: string;
  tone?: "up" | "down";
}

export function StatColumn({ title, rows }: { title: string; rows: StatRow[] }) {
  return (
    <div className={styles.col}>
      <div className={styles.colTitle}>{title}</div>
      {rows.map((r) => (
        <div key={r.label} className={styles.statRow}>
          <span className={styles.statLabel}>{r.label}</span>
          <span className={r.tone ? styles[r.tone] : undefined}>{r.value}</span>
        </div>
      ))}
    </div>
  );
}
