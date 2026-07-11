export function formatSum(amount: number): string {
  return `${Math.round(amount).toLocaleString("uz-UZ")} so'm`;
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "🗒 Qoralama",
  PENDING: "⏳ Kutilmoqda",
  APPROVED: "✅ Tasdiqlangan",
  DELIVERED: "🚚 Yetkazildi",
  CANCELLED: "❌ Bekor qilingan",
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}
