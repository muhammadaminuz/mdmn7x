# 🤖 HR Bot — rezyumelarni Claude bilan saralovchi Telegram bot

Nomzodlar botga ariza topshiradi (ism, telefon, lavozim, rezyume). Bot rezyumeni **Claude** ga tahlil qildiradi
va **minimal balldan yuqori** nomzodlarni sizga (adminga) to'liq tahlil + rezyume fayli bilan yuboradi.

Claude **API kaliti bilan emas**, sizning mavjud **Claude obuna akkauntingiz (Pro/Max) tokeni** bilan ishlaydi —
bot Claude Code CLI'ni (`claude -p`) `CLAUDE_CODE_OAUTH_TOKEN` bilan chaqiradi.

## Qanday ishlaydi

```
Nomzod: /start → ism → telefon → lavozim tanlash → rezyume (PDF / DOCX / TXT / rasm / matn)
   ↓
Bot: "Arizangiz qabul qilindi" → fonda Claude tahlili (ball 0-100, xulosa, kuchli/zaif tomonlar, suhbat savollari)
   ↓
Ball ≥ MIN_SCORE → sizga karta + rezyume fayli yuboriladi
```

## O'rnatish

### 1. Telegram bot yaratish
[@BotFather](https://t.me/BotFather) → `/newbot` → tokenni oling (`BOT_TOKEN`).

### 2. Claude akkaunt tokenini olish
Kompyuteringizda (Node.js 18+ kerak):

```bash
npm install -g @anthropic-ai/claude-code
claude setup-token
```

Brauzerda Claude akkauntingizga kirasiz va `sk-ant-oat01-...` ko'rinishidagi uzoq muddatli token chiqadi —
bu `CLAUDE_CODE_OAUTH_TOKEN`. (Pro yoki Max obuna kerak.)

### 3. O'z Telegram ID'ingizni bilish
Botni ishga tushirgach unga `/myid` yozing, yoki [@userinfobot](https://t.me/userinfobot) dan foydalaning.
Guruhga yuborilishini xohlasangiz — botni guruhga qo'shing va guruh ID'sini (`-100...`) yozing.

### 4. Sozlash

```bash
cd hr-bot
cp .env.example .env   # va qiymatlarni to'ldiring
```

| O'zgaruvchi | Tavsif |
|---|---|
| `BOT_TOKEN` | BotFather tokeni |
| `ADMIN_CHAT_IDS` | Natijalar boradigan chat ID(lar), vergul bilan |
| `CLAUDE_CODE_OAUTH_TOKEN` | `claude setup-token` dan olingan token |
| `MIN_SCORE` | Saralash chegarasi (default `70`) |
| `CLAUDE_MODEL` | `sonnet` (default), `opus` yoki `haiku` |
| `ANALYSIS_CONCURRENCY` | Bir vaqtda nechta tahlil (default `1`) |
| `NOTIFY_REJECTED` | `true` bo'lsa, past ballilar haqida ham qisqa xabar keladi |

Vakansiyalar va talablarni **`vacancies.json`** faylida o'zgartiring — Claude aynan shu talablar bo'yicha baholaydi.
Faylni o'zgartirgach botni qayta ishga tushirish shart emas.

### 5. Ishga tushirish

**Oddiy usul:**
```bash
npm install -g @anthropic-ai/claude-code   # serverda ham CLI kerak
npm install
npm run build
npm start
```

**Docker bilan** (loyiha ildizidan):
```bash
docker compose --profile hr-bot up -d --build hr-bot
```

## Admin buyruqlari

| Buyruq | Vazifa |
|---|---|
| `/stats` | Statistika |
| `/top` | Eng yuqori ballli 10 nomzod |
| `/recent` | Oxirgi 10 ariza |
| `/view_ID` | Nomzod kartasi va rezyumesi |
| `/retry_ID` | Tahlilni qayta bajarish (xato bo'lsa) |
| `/myid` | Telegram ID'ingizni ko'rish |

## Ma'lumotlar

Barcha arizalar `data/candidates.json` da, rezyume fayllari `data/resumes/<ID>/` da saqlanadi.

## Eslatmalar

- Tahlil obuna limitlaringizdan foydalanadi. Ko'p ariza kelsa, `ANALYSIS_CONCURRENCY=1` qoldiring — arizalar navbatda kutadi.
- Claude faqat `Read` vositasi bilan ishlaydi (faylni o'qish), Bash/internet/fayl yozish o'chirilgan.
- Obuna tokeni shaxsiy foydalanish uchun. Botni ko'pchilikka xizmat sifatida taqdim etmoqchi bo'lsangiz,
  Anthropic shartlariga ko'ra API kalitiga o'tish kerak bo'ladi.
