"use client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface AgentData {
  agentName: string;
  target: number;
  achieved: number;
  performance: number;
}

export default function AgentPerformanceChart({ data }: { data: AgentData[] }) {
  const chartData = data.map((d) => ({
    name: d.agentName.split(" ")[0],
    fullName: d.agentName,
    performance: d.performance,
    target: Math.round(d.target / 1_000_000),
    achieved: Math.round(d.achieved / 1_000_000),
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} unit="M" />
        <Tooltip
          formatter={(value: number, name: string) => [`${value}M so'm`, name === "target" ? "Maqsad" : "Bajarilgan"]}
          contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "12px" }}
        />
        <Bar dataKey="target" fill="#e5e7eb" radius={[4, 4, 0, 0]} maxBarSize={28} />
        <Bar dataKey="achieved" radius={[4, 4, 0, 0]} maxBarSize={28}>
          {chartData.map((entry, index) => (
            <Cell key={index} fill={entry.performance >= 90 ? "#22c55e" : entry.performance >= 80 ? "#3b82f6" : "#f59e0b"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
