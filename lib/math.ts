function safeDivide(num: number | null, den: number | null): number | null {
  if (num === null || den === null) return null;
  if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return null;
  return num / den;
}

export function shareOfFederal(contracts: number | null, total: number | null): number | null {
  return safeDivide(contracts, total);
}

export function federallyFed(contracts: number | null, revenue: number | null): number | null {
  return safeDivide(contracts, revenue);
}

export function perHundred(share: number | null): number | null {
  return share === null ? null : share * 100;
}

export function perDollar(fed: number | null): number | null {
  return fed;
}
