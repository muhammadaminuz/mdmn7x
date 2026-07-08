# Telegram Xarajat Boti (Google Sheets integratsiyasi)

Telegram bot orqali xarajat va daromadlarni yozib boring — har bir yozuv real vaqtda Google Sheets jadvaliga tushadi. Istalgan payt yoki oy oxirida `/hisobot` buyrug'i bilan kategoriya bo'yicha xarajatlar, haftalik dinamika va foyda/zarar hisobini matn va Excel (.xlsx) fayl ko'rinishida olasiz.

## Sozlash

### 1. Telegram bot yaratish
1. Telegram'da [@BotFather](https://t.me/BotFather) bilan suhbat oching.
2. `/newbot` buyrug'ini yuboring va nomini tanlang.
3. Sizga beriladigan tokenni saqlang — bu `BOT_TOKEN`.

### 2. Google Sheets va Service Account
1. [Google Cloud Console](https://console.cloud.google.com/) da yangi loyiha yarating (yoki mavjudidan foydalaning).
2. **Google Sheets API** ni yoqing (APIs & Services → Enable APIs).
3. **Service Account** yarating (IAM & Admin → Service Accounts → Create Service Account).
4. Service account uchun JSON kalit yarating va yuklab oling — uni loyihaga `service-account.json` nomi bilan saqlang (bu fayl `.gitignore` orqali repo'ga tushmaydi).
5. Yangi Google Sheets jadval yarating va uni service account'ning email manzili bilan (masalan `xxx@xxx.iam.gserviceaccount.com`) **Editor** huquqi bilan ulashing.
6. Jadval URL'idagi ID'ni (`/d/` va `/edit` orasidagi qism) `SPREADSHEET_ID` sifatida saqlang.

### 3. O'rnatish

```bash
cd telegram-expense-bot
npm install
cp .env.example .env
# .env faylini to'ldiring: BOT_TOKEN, SPREADSHEET_ID, GOOGLE_SERVICE_ACCOUNT_KEY_FILE
npm run dev
```

## Foydalanish

- **➕ Xarajat** / **➕ Daromad** — summani, kategoriyani va izohni ketma-ket so'raydi, so'ng Google Sheets'ga yozadi.
- **📊 Oylik hisobot** (yoki `/hisobot`) — joriy oy uchun:
  - jami xarajat, jami daromad, foyda/zarar
  - kategoriya bo'yicha xarajatlar taqsimoti
  - haftalik dinamika
  - va shu ma'lumotlar bilan tayyor `.xlsx` fayl (Xulosa + Tafsilotlar varaqlari)

## Loyiha tuzilishi

```
telegram-expense-bot/
├── src/
│   ├── index.ts       # Bot buyruqlari va suhbat oqimi (Telegraf)
│   ├── sheets.ts       # Google Sheets API bilan ishlash (append/read)
│   ├── report.ts       # Oylik hisobotni hisoblash va matn shaklida formatlash
│   ├── excel.ts         # .xlsx fayl generatsiya qilish (exceljs)
│   ├── categories.ts     # Xarajat/daromad kategoriyalari
│   └── types.ts            # Umumiy TypeScript turlari
├── .env.example
└── package.json
```

## Ishlab chiqarishga chiqarish

```bash
npm run build
npm start
```

Botni doimiy ishlab turishi uchun `pm2`, `systemd` yoki Docker konteyneridan foydalaning.
