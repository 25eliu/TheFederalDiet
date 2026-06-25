import styles from "./receipt.module.css";
import { Stamp } from "./Stamp";
import { LedgerLine } from "./LedgerLine";
import { StatColumn } from "./StatColumn";
import {
  formatCompactUSD,
  formatPercent,
  formatSignedPercent,
  formatUSD2,
} from "@/lib/format";
import type { ReceiptData } from "@/lib/receipt/types";

export function Receipt({ data }: { data: ReceiptData }) {
  const eyebrow = `THE FEDERAL DIET · RECEIPT · FY${data.fiscalYear} · NO.${data.receiptNo}`;

  if (data.status === "no-contracts") {
    return (
      <article className={styles.card} data-testid="receipt">
        <div className={styles.eyebrow}>{eyebrow}</div>
        <div className={styles.preheadline}>On the federal diet</div>
        <h1 className={styles.company}>{data.company}</h1>
        <p className={styles.goodNews}>
          Good news — {data.company} isn&apos;t on the federal diet.
        </p>
        <p className={styles.note}>No federal contract obligations found for FY{data.fiscalYear}.</p>
        <Footer data={data} />
      </article>
    );
  }

  const stampLabel = data.isPrivate ? "" : formatPercent(data.federallyFed);

  return (
    <article className={styles.card} data-testid="receipt">
      <div className={styles.eyebrow}>{eyebrow}</div>
      <div className={styles.preheadline}>On the federal diet</div>
      <h1 className={styles.company}>{data.company}</h1>

      <div className={styles.hero}>
        <span className={styles.heroNum}>{formatCompactUSD(data.contracts)}</span>
        <span className={styles.heroLabel}>consumed in fed. contracts</span>
      </div>

      <Stamp percentLabel={stampLabel} />

      <div className={styles.columns}>
        <StatColumn
          title="Federal Contracts"
          rows={[
            { label: "Contracts", value: formatCompactUSD(data.contracts) },
            { label: "Rank", value: data.rank ? `#${data.rank}` : "data unavailable" },
            { label: "Share of all fed.", value: formatPercent(data.shareOfFederal) },
          ]}
        />
        <StatColumn
          title="Company Health"
          rows={[
            { label: "Revenue", value: formatCompactUSD(data.revenue) },
            { label: "Net income", value: formatCompactUSD(data.netIncome) },
            {
              label: "Stock 1-yr",
              value: formatSignedPercent(data.stockChange1y),
              tone: data.stockChange1y === null ? undefined : data.stockChange1y >= 0 ? "up" : "down",
            },
          ]}
        />
      </div>

      <div className={styles.ledgerBlock}>
        <LedgerLine
          label={`Of every $100 in federal contract spending, this much went to ${data.company}`}
          value={formatUSD2(data.perHundred)}
        />
        {!data.isPrivate && (
          <LedgerLine
            label={`Of every $1 of ${data.company} revenue, this much is federal`}
            value={formatUSD2(data.perDollar)}
          />
        )}
      </div>

      {data.explanation && <p className={styles.explanation}>{data.explanation}</p>}

      <Footer data={data} />
    </article>
  );
}

function Footer({ data }: { data: ReceiptData }) {
  return (
    <footer className={styles.footer}>
      <div className={styles.barcode} aria-hidden />
      <p className={styles.sources}>
        Sources: U.S. Treasury / USASpending, S&amp;P Global, Xignite — via Tako. Figures = obligations.
      </p>
      {data.takoEmbedUrl && (
        <a className={styles.takoLink} href={data.takoEmbedUrl} target="_blank" rel="noreferrer">
          Open in Tako →
        </a>
      )}
    </footer>
  );
}
