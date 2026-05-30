import { clsx } from "clsx";

const statusColors = {
  DELIVERED: "bg-green-100 text-green-700",
  APPROVED: "bg-blue-100 text-blue-700",
  PENDING: "bg-amber-100 text-amber-700",
  DRAFT: "bg-gray-100 text-gray-600",
  CANCELLED: "bg-red-100 text-red-700",
  ACTIVE: "bg-green-100 text-green-700",
  INACTIVE: "bg-gray-100 text-gray-600",
  BLOCKED: "bg-red-100 text-red-700",
  CRITICAL: "bg-red-100 text-red-700",
  OVERDUE: "bg-amber-100 text-amber-700",
  CURRENT: "bg-blue-100 text-blue-700",
  REJECTED: "bg-red-100 text-red-700",
  COMPLETED: "bg-green-100 text-green-700",
  INCOMING: "bg-green-100 text-green-700",
  OUTGOING: "bg-red-100 text-red-700",
  TRANSFER: "bg-blue-100 text-blue-700",
  RETURN_IN: "bg-purple-100 text-purple-700",
  RETURN_OUT: "bg-orange-100 text-orange-700",
  ADJUSTMENT: "bg-gray-100 text-gray-700",
};

const statusLabels: Record<string, string> = {
  DELIVERED: "Yetkazildi",
  APPROVED: "Tasdiqlandi",
  PENDING: "Kutilmoqda",
  DRAFT: "Qoralama",
  CANCELLED: "Bekor qilindi",
  ACTIVE: "Faol",
  INACTIVE: "Nofaol",
  BLOCKED: "Bloklangan",
  CRITICAL: "Kritik",
  OVERDUE: "Muddati o'tgan",
  CURRENT: "Joriy",
  REJECTED: "Rad etildi",
  COMPLETED: "Bajarildi",
  INCOMING: "Kirim",
  OUTGOING: "Chiqim",
  TRANSFER: "Ko'chirish",
  RETURN_IN: "Qaytarish kirim",
  RETURN_OUT: "Qaytarish chiqim",
  ADJUSTMENT: "Tuzatish",
};

interface BadgeProps {
  status: string;
  label?: string;
}

export function Badge({ status, label }: BadgeProps) {
  const colorClass = statusColors[status as keyof typeof statusColors] || "bg-gray-100 text-gray-600";
  const displayLabel = label || statusLabels[status] || status;
  return (
    <span className={clsx("status-badge", colorClass)}>
      {displayLabel}
    </span>
  );
}
