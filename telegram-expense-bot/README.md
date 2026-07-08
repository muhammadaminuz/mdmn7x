# Xarajatlar AI

Distribyutsiya biznesi uchun Telegram bot: xodim botga erkin matn bilan xarajat yozadi ("50000 yoqilg'iga"), AI summani va turini aniqlaydi, tasdiqlangandan so'ng ma'lumot **to'g'ridan-to'g'ri sizning mavjud balans faylingizga (Google Sheets)** tushadi — fayldagi hech qanday formula o'zgartirilmaydi yoki buzilmaydi.

## Fayl bilan qanday ishlaydi

Yuklagan balans faylingiz (`DS___2026_2.xlsx`) tekshirildi. Unda `Оборотка` varag'ida allaqachon shu maqsad uchun ajratilgan, bo'sh **"харажатлар"** bloki bor (`V`/`W`/`X` ustunlari: сана / сумма / харажат тури), va bu blok `Якуний хисобот` varag'idagi "Жами харажат" yakuniy formulasiga avtomatik qo'shiladi.

Bot shu blokka yozadi, lekin **faqat mavjud kun qatoriga**:
- Botga yozilgan xarajat sanasiga mos qator `Оборотка` varag'ida (A ustunidagi sana bo'yicha) qidiriladi.
- Agar shu kun uchun qator topilsa — summa o'sha qatordagi mavjud summaga **qo'shiladi** (bir kunda bir nechta xarajat bo'lsa ham to'g'ri jamlanadi), turi эса vergul bilan qo'shiladi.
- Agar sana uchun qator hali tayyorlanmagan bo'lsa (masalan, yangi oy hali fayl shabloniga qo'shilmagan), bot yozmaydi va foydalanuvchiga ogohlantirish yuboradi — bu formulalarni tasodifan buzib qo'ymaslik uchun.
- Bot hech qachon yangi qator qo'shmaydi, formula katakchalariga tegmaydi, boshqa varaqlarni (`761 VMA`, `карз`, `склад` va h.k.) o'zgartirmaydi.

## Sozlash

### 1. Telegram bot
1. [@BotFather](https://t.me/BotFather) orqali `/newbot` — nomini masalan **Xarajatlar AI** deb qo'ying.
2. Tokenni saqlang — `BOT_TOKEN`.

### 2. Google Cloud + Service Account
1. [Google Cloud Console](https://console.cloud.google.com/) da loyiha oching, **Google Sheets API** va **Google Drive API** larni yoqing.
2. Service Account yarating, JSON kalitini yuklab, `service-account.json` nomi bilan shu papkaga saqlang (repo'ga tushmaydi, `.gitignore`'da).

### 3. Balans faylini Google Sheets'ga yuklash

Bu skript sizning `.xlsx` faylingizni Google Drive'ga Google Sheets sifatida yuklaydi — **import paytida Google formulalarni avtomatik saqlab qoladi**, hech narsa qo'lda o'zgartirish shart emas:

```bash
cd telegram-expense-bot
npm install
cp .env.example .env
# .env faylida GOOGLE_SERVICE_ACCOUNT_KEY_FILE ni to'g'rilang

npm run import-sheet -- /path/to/DS___2026_2.xlsx sizning@gmail.com
```

Skript oxirida chiqadigan `SPREADSHEET_ID` ni `.env` fayliga yozing.

> Fayl service account nomidan yaratiladi, shuning uchun uni real hisobingiz bilan ulashish (skriptga email bergan holda) shart — aks holda uni faqat service account ko'radi.

### 4. AI (ixtiyoriy, lekin tavsiya etiladi)

`.env` faylida `GEMINI_API_KEY` yoki `ANTHROPIC_API_KEY` dan birini qo'ysangiz, bot xabarni to'liq erkin matn sifatida tushunadi (masalan "bugun mashinaga ta'mirlash uchun 350 ming to'ladik"). Ikkalasi ham bo'lsa — Gemini ustunlik qiladi. Hech qaysi kalit bo'lmasa, bot oddiy qoidaviy usulga o'tadi: xabardagi birinchi sonni summa, qolganini tur sifatida oladi.

- **Gemini** (bepul tarif): [aistudio.google.com/apikey](https://aistudio.google.com/apikey) dan kalit oling.
- **Anthropic** (keyinchalik o'tish uchun): [console.anthropic.com](https://console.anthropic.com) dan kalit oling — `ANTHROPIC_API_KEY` ni qo'ysangiz va `GEMINI_API_KEY` ni bo'shatsangiz, bot avtomatik Anthropic'ga o'tadi.

### 5. Ishga tushirish

```bash
npm run dev
```

## Foydalanish

- Botga oddiy xabar yozing: `50000 yoqilg'iga`
- Bot summani, turini va sanani (odatda bugungi kun) aniqlab, tasdiqlash uchun qaytaradi:
  **✅ Saqlash** / **✏️ Turini o'zgartirish** / **❌ Bekor qilish**
- Tasdiqlagach, ma'lumot Google Sheets balans fayliga tushadi va fayldagi mavjud formulalar orqali "Якуний хисобот"да avtomatik hisoblanadi. Saqlangandan so'ng faylning o'ziga ochiladigan tugma ham chiqadi.
- `/hisobot` — joriy hisobotdan jami tushum, jami xarajat va sof sotishni o'qib beradi (mavjud formulalar natijasini o'qiydi, hech narsani qayta hisoblamaydi).
- `/fayl` — Google Sheets balans faylini to'g'ridan-to'g'ri ochish uchun havola (aynan "Оборотка" varag'iga olib boradi).

## Muhim cheklov

`Якуний хисобот` varag'idagi yakuniy formula (masalan `SUM(Оборотка!W3:W33)`) aniq qator oralig'iga bog'langan — bu odatda bir oylik hisobot shabloni. **Yangi oy boshlanganda**, faylda shu oy uchun kunlik qatorlar (sanalar) tayyorlanishi kerak (odatdagidek, faylni tayyorlagan kishi tomonidan) — shundan keyingina bot o'sha kunlar uchun yoza oladi. Bu qadam avtomatlashtirilmagan, chunki u yakuniy hisobot formulalarining tuzilishini o'zgartirishni talab qiladi va xato qilingan taqdirda moliyaviy hisobotni buzishi mumkin.

## Loyiha tuzilishi

```
telegram-expense-bot/
├── src/
│   ├── index.ts     # Bot oqimi: AI orqali tahlil → tasdiqlash → yozish
│   ├── ai.ts         # Anthropic API bilan erkin matnni tahlil qilish (+ zaxira qoida asosidagi usul)
│   ├── sheets.ts       # Google Sheets bilan ishlash: sanaga mos qatorni topish, W/X ustunlariga yozish
│   └── types.ts          # Umumiy TypeScript turlari
├── scripts/
│   └── import-to-sheets.ts  # Lokal .xlsx faylni Google Sheets'ga yuklovchi bir martalik skript
└── .env.example
```
