import { Notification } from "../types";

export const notifications: Notification[] = [
  { id: 1, type: "NEW_ORDER", title: "Yangi buyurtma", message: "Gold Market dan ORD-2025-0003 buyurtma keldi - 1,361,200 so'm", isRead: false, createdAt: "2025-05-28T11:00:00Z" },
  { id: 2, type: "LOW_STOCK", title: "Kam qoldiq", message: "Nestea 0.5L - faqat 40 ta qoldi (minimal: 50)", isRead: false, createdAt: "2025-05-28T10:30:00Z" },
  { id: 3, type: "LOW_STOCK", title: "Kam qoldiq", message: "Rich Mango 1L - faqat 25 ta qoldi (minimal: 40)", isRead: false, createdAt: "2025-05-28T10:00:00Z" },
  { id: 4, type: "DEBT_REMINDER", title: "Qarz eslatmasi", message: "Nargiza Savdo qarzi: 6,800,000 so'm. 15 kundan ortiq muddati o'tgan", isRead: false, createdAt: "2025-05-28T09:00:00Z" },
  { id: 5, type: "TARGET_ACHIEVED", title: "Maqsad bajarildi!", message: "Sanjar Yoʻldoshev oylik maqsadining 94.8% ni bajarди!", isRead: true, createdAt: "2025-05-28T08:00:00Z" },
  { id: 6, type: "PAYMENT_RECEIVED", title: "To'lov qabul qilindi", message: "Abdulla Market dan 1,107,600 so'm to'lov olindi", isRead: true, createdAt: "2025-05-28T13:00:00Z" },
  { id: 7, type: "NEW_ORDER", title: "Yangi buyurtma", message: "Baxt Market dan ORD-2025-0005 buyurtma keldi - 1,270,000 so'm", isRead: true, createdAt: "2025-05-28T11:00:00Z" },
  { id: 8, type: "DEBT_REMINDER", title: "Kritik qarz", message: "Mushtariy Savdo qarzi: 7,200,000 so'm - KRITIK holat!", isRead: false, createdAt: "2025-05-27T09:00:00Z" },
];

export let notificationsStore = [...notifications];
