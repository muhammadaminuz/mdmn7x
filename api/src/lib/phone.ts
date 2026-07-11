export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

// Compares by the last `len` digits so "+998901234567", "998901234567" and "901234567" all match.
export function samePhone(a: string, b: string, len = 9): boolean {
  const da = normalizePhone(a).slice(-len);
  const db = normalizePhone(b).slice(-len);
  return da.length === len && da === db;
}
