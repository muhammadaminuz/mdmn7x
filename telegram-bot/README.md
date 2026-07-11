# B2B Buyurtma Telegram Boti

Mustaqil Telegram bot — B2B mijozlar bot orqali ro'yxatdan o'tadi, mahsulot katalogidan buyurtma beradi, admin esa buyurtmalarni tasdiqlaydi/bekor qiladi. Hech qanday tashqi server yoki baza talab qilinmaydi — hammasi shu papkadagi bitta SQLite fayl (`dev.db`) ichida saqlanadi.

## O'rnatish

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

`.env` faylida (`.env.example`dan nusxa oling):

```
BOT_TOKEN=...      # @BotFather'dan olingan token
DATABASE_URL=file:./dev.db
ADMIN_IDS=         # bo'sh qoldiring, keyin to'ldirasiz
```

## Administrator qilib belgilash

1. Botni ishga tushiring (`npm run dev`).
2. Telegram'da botga `/id` deb yozing — u sizning Telegram ID'ingizni ko'rsatadi.
3. Shu ID'ni `.env` faylidagi `ADMIN_IDS` ga yozing (bir nechta admin bo'lsa vergul bilan ajrating: `ADMIN_IDS=111111,222222`).
4. Botni qayta ishga tushiring (`Ctrl+C`, keyin yana `npm run dev`).

## Admin buyruqlari

- `/mahsulot_qoshish` — yangi mahsulot qo'shish (nomi, toifasi, narxi, qoldig'i)
- `/mahsulotlar` — mahsulotlar ro'yxati, narxini o'zgartirish yoki o'chirish
- `/buyurtmalar` — oxirgi buyurtmalar ro'yxati
- Yangi buyurtma tushganda avtomatik xabar keladi — ✅ Tasdiqlash / ❌ Bekor qilish tugmalari bilan

## Mijoz (B2B xaridor) oqimi

1. `/start` — telefon raqami va korxona nomini kiritib ro'yxatdan o'tadi
2. 🛒 Buyurtma berish / 📦 Katalog — toifa → mahsulot → miqdor → savat → tasdiqlash
3. 📋 Buyurtmalarim — oxirgi buyurtmalar tarixi
4. 🏢 Ma'lumotlarim — ro'yxatdan o'tgan ma'lumotlari

## Production'da ishga tushirish

```bash
npm run build
npm start
```

Yoki Docker orqali:

```bash
docker build -t b2b-order-bot .
docker run -d --env-file .env -v $(pwd)/data:/app/data b2b-order-bot
```
