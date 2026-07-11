function parseAdminIds(): Set<number> {
  const raw = process.env.ADMIN_IDS || "";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map(Number)
      .filter((n) => !isNaN(n))
  );
}

export const ADMIN_IDS = parseAdminIds();

export function isAdmin(userId: number | undefined): boolean {
  return userId !== undefined && ADMIN_IDS.has(userId);
}
