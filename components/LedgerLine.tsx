import styles from "./receipt.module.css";

export function LedgerLine({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.ledger}>
      <span>{label}</span>
      <span className={styles.leader} aria-hidden />
      <span className={styles.value}>{value}</span>
    </div>
  );
}
