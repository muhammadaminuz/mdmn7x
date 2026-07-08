export interface Product {
  index: number; // 0-based position in the catalog; MUST stay dense/unfiltered — truck
  // sheets mirror "склад" row-for-row (including its "ЖАМИ" subtotal divider rows), so
  // gaps here would misalign every product after a gap with the wrong sheet row.
  name: string;
  isSubtotal: boolean; // "ЖАМИ" divider row - holds a formula on the truck sheets, never writable
}

export interface MatchResult {
  line: string;
  product: Product | null;
  sold: number;
  returned: number;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();
}

// Finds the catalog entry for a free-typed product name. Exact normalized match wins;
// otherwise falls back to substring containment either direction. Returns null (not a
// guess) when nothing or multiple different things match, so the caller can flag it.
export function matchProduct(catalog: Product[], typedName: string): Product | null {
  const needle = normalize(typedName);
  if (!needle) return null;

  const candidates = catalog.filter((p) => !p.isSubtotal);

  const exact = candidates.find((p) => normalize(p.name) === needle);
  if (exact) return exact;

  // Many products across different brands share a flavor word (e.g. "манго" appears in
  // both "Манго -Dena 1л" and "Time Tea манго и ананас..."), so plain substring
  // containment is ambiguous. Product names in this catalog lead with the distinguishing
  // word, so prefer a prefix match before falling back to contains-anywhere.
  const startsWith = candidates.filter((p) => normalize(p.name).startsWith(needle));
  if (startsWith.length === 1) return startsWith[0];

  const contains = candidates.filter((p) => normalize(p.name).includes(needle) || needle.includes(normalize(p.name)));
  return contains.length === 1 ? contains[0] : null;
}

// Parses lines like "Манго 5 1" (name, sold, returned) or "Манго 5" (returned defaults to 0).
export function parseSalesLines(text: string, catalog: Product[]): MatchResult[] {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  return lines.map((line) => {
    const match = line.match(/^(.*?)\s+(\d+)(?:\s+(\d+))?\s*$/);
    if (!match) return { line, product: null, sold: 0, returned: 0 };

    const [, namePart, soldStr, returnedStr] = match;
    return {
      line,
      product: matchProduct(catalog, namePart),
      sold: Number(soldStr),
      returned: returnedStr ? Number(returnedStr) : 0,
    };
  });
}
