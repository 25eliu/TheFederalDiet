import styles from "./receipt.module.css";

export function Stamp({ percentLabel }: { percentLabel: string }) {
  if (!percentLabel) return null;
  return (
    <div className={styles.stamp} aria-label={`Federally fed: ${percentLabel}`}>
      <div className={styles.stampPct}>{percentLabel}</div>
      <div className={styles.stampLabel}>FEDERALLY FED</div>
    </div>
  );
}
