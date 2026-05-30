"use client";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#6b7280", "#ef4444"];
const LABELS: Record<string, string> = {
  DELIVERED: "Yetkazildi",
  APPROVED: "Tasdiqlandi",
  PENDING: "Kutilmoqda",
  DRAFT: "Qoralama",
  CANCELLED: "Bekor qilindi",
};

interface StatusData {
  status: string;
  count: number;
  percentage: number;
}

export default function OrderStatusChart({ data }: { data: StatusData[] }) {
  const chartData = data.map((d) => ({ name: LABELS[d.status] || d.status, value: d.count }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={chartData} cx="50%" cy="45%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
          {chartData.map((_, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "12px" }} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
