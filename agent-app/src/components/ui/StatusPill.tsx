export function Badge({ status, label }: { status: string; label?: string }) {
  const map: Record<string, string> = {
    DELIVERED: "bg-green-100 text-green-700",
    APPROVED: "bg-blue-100 text-blue-700",
    PENDING: "bg-amber-100 text-amber-700",
    DRAFT: "bg-gray-100 text-gray-600",
    CANCELLED: "bg-red-100 text-red-700",
  };
  const labels: Record<string, string> = {
    DELIVERED: "Yetkazildi", APPROVED: "Tasdiqlandi",
    PENDING: "Kutilmoqda", DRAFT: "Qoralama", CANCELLED: "Bekor qilindi",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || "bg-gray-100 text-gray-600"}`}>
      {label || labels[status] || status}
    </span>
  );
}
