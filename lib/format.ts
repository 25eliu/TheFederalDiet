const UNAVAILABLE = "data unavailable";

export function formatCompactUSD(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return UNAVAILABLE;
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e9) return `${sign}$${trim(abs / 1e9)}B`;
  if (abs >= 1e6) return `${sign}$${trim(abs / 1e6)}M`;
  if (abs >= 1e3) return `${sign}$${trim(abs / 1e3)}K`;
  return `${sign}$${Math.round(abs)}`;
}

// Drop a trailing ".0" so 250.0 -> "250" but 14.1 stays "14.1".
function trim(x: number): string {
  const r = Math.round(x * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

export function formatPercent(fraction: number | null, decimals = 1): string {
  if (fraction === null || !Number.isFinite(fraction)) return UNAVAILABLE;
  return `${(fraction * 100).toFixed(decimals)}%`;
}

export function formatSignedPercent(fraction: number | null, decimals = 1): string {
  if (fraction === null || !Number.isFinite(fraction)) return UNAVAILABLE;
  const pct = (fraction * 100).toFixed(decimals);
  if (fraction < 0) return `−${pct.replace("-", "")}%`; // U+2212 minus
  return `+${pct}%`;
}

export function formatUSD2(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return UNAVAILABLE;
  return `$${n.toFixed(2)}`;
}

export function receiptNumber(company: string, fiscalYear: number): string {
  const seed = `${company.trim().toLowerCase()}|${fiscalYear}`;
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return String(h % 10000).padStart(4, "0");
}
