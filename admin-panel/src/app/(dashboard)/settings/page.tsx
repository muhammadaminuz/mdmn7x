"use client";
import { useState } from "react";
import { Save, User, Bell, Shield, Globe, Database } from "lucide-react";

const sections = [
  { id: "profile", label: "Profil", icon: User },
  { id: "notifications", label: "Bildirishnomalar", icon: Bell },
  { id: "security", label: "Xavfsizlik", icon: Shield },
  { id: "system", label: "Tizim", icon: Globe },
  { id: "database", label: "Ma'lumotlar bazasi", icon: Database },
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("profile");
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">Sozlamalar</h2>

      <div className="flex gap-4">
        {/* Sidebar */}
        <div className="w-52 flex-shrink-0 bg-white rounded-xl border border-gray-100 p-3 shadow-sm h-fit">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeSection === s.id ? "bg-brand-500 text-white" : "text-gray-600 hover:bg-gray-50"}`}
            >
              <s.icon className="w-4 h-4" />
              {s.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
          {activeSection === "profile" && (
            <div className="space-y-5">
              <h3 className="font-semibold text-gray-900 text-lg">Profil Ma'lumotlari</h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "To'liq ism", value: "Ahmad Karimov" },
                  { label: "Email", value: "admin@demo.com" },
                  { label: "Telefon", value: "+998901234567" },
                  { label: "Lavozim", value: "Super Admin" },
                ].map((f) => (
                  <div key={f.label}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                    <input defaultValue={f.value} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === "notifications" && (
            <div className="space-y-5">
              <h3 className="font-semibold text-gray-900 text-lg">Bildirishnoma Sozlamalari</h3>
              {[
                { label: "Yangi buyurtma", desc: "Yangi buyurtma kelganda xabar olish" },
                { label: "Qarz eslatmasi", desc: "Muddati o'tgan qarzlar haqida" },
                { label: "Kam qoldiq", desc: "Mahsulot omborda kamayganda" },
                { label: "Maqsad bajarildi", desc: "Agent maqsadini bajarganida" },
                { label: "Email bildirishnomalar", desc: "Email orqali xabar olish" },
                { label: "Telegram bot", desc: "Telegram orqali xabar olish" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-3 border-b border-gray-100">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{item.label}</div>
                    <div className="text-xs text-gray-400">{item.desc}</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-10 h-5 bg-gray-200 rounded-full peer peer-checked:bg-brand-500 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
                  </label>
                </div>
              ))}
            </div>
          )}

          {activeSection === "security" && (
            <div className="space-y-5">
              <h3 className="font-semibold text-gray-900 text-lg">Xavfsizlik</h3>
              <div className="space-y-4">
                {[
                  { label: "Joriy parol", type: "password" },
                  { label: "Yangi parol", type: "password" },
                  { label: "Yangi parolni tasdiqlang", type: "password" },
                ].map((f) => (
                  <div key={f.label}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                    <input type={f.type} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                ))}
              </div>
              <div className="p-4 bg-blue-50 rounded-lg text-sm text-blue-700">
                <strong>Eslatma:</strong> Ikki bosqichli autentifikatsiya (2FA) yoqilmagan. Xavfsizlik uchun yoqishni tavsiya qilamiz.
              </div>
            </div>
          )}

          {(activeSection === "system" || activeSection === "database") && (
            <div className="flex items-center justify-center h-48 text-gray-400">
              <div className="text-center">
                <div className="text-4xl mb-3">⚙️</div>
                <p className="text-sm">Bu bo'lim ishlab chiqilmoqda</p>
              </div>
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-gray-100 flex items-center gap-3">
            <button onClick={handleSave} className="btn-primary">
              <Save className="w-4 h-4" />Saqlash
            </button>
            {saved && <span className="text-sm text-green-600 font-medium">✓ Saqlandi!</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
