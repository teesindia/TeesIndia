/** Convert a rupee amount at an API/UI boundary into whole paise for storage. */
export function rupeesToPaise(rupees: number): number {
  if (!Number.isFinite(rupees)) throw new Error('Amount must be a finite number');
  return Math.round(rupees * 100);
}

/** Convert canonical integer paise to rupees for existing API/UI consumers. */
export function paiseToRupees(paise: number): number {
  if (!Number.isSafeInteger(paise)) throw new Error('Amount in paise must be a safe integer');
  return paise / 100;
}
