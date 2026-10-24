# 🤖 HR Bot — rezyumelarni Claude bilan saralovchi Telegram bot

Nomzodlar botga ariza topshiradi (ism, telefon, lavozim, rezyume). Bot rezyumeni **Claude** ga tahlil qildiradi
va **minimal balldan yuqori** nomzodlarni sizga (adminga) to'liq tahlil + rezyume fayli bilan yuboradi.

Claude **API kaliti bilan emas**, sizning mavjud **Claude obuna akkauntingiz (Pro/Max) tokeni** bilan ishlaydi —
bot Claude Code CLI'ni (`claude -p`) `CLAUDE_CODE_OAUTH_TOKEN` bilan chaqiradi.

## Qanday ishlaydi

```
Nomzod: /start → lavozim tanlash (Savdo agenti, Haydovchi, Omborchi, Buxgalter, Boshqa)
   → usulni tanlash:
       📝 Savollarga javob berish   — bot birma-bir so'raydi (tugmalar bilan), oxirida nomzod tekshirib TASDIQLAYDI
       📎 Tayyor rezyume/anketa      — istalgan format: PDF, DOC/DOCX, TXT, rasm (bir nechta), yoki matn
       📄 Bo'sh anketa blankasi      — bot DOCX anketa beradi, nomzod to'ldirib rasm/fayl qilib qaytaradi
   ↓
Claude tahlili: ball 0-100, xulosa, kuchli/zaif tomonlar, suhbat savollari.
Rezyume fayl bo'lsa — Claude undan anketa maydonlarini AVTOMATIK to'ldiradi.
   ↓
Sizga: karta + to'ldirilgan anketa (DOCX) + nomzodning asl fayllari
  • ball ≥ MIN_SCORE — to'liq
  • past ball — qisqa xabar (/view_ID bilan ochiladi)
```

### Claude limiti / tokeni tugasa
Bot to'xtamaydi: ariza baribir **AI tahlilisiz** sizga keladi (barcha javoblar, anketa va fayllar bilan).
Bot har `RETRY_MINUTES` (default 60) daqiqada qayta urinadi; AI ishlay boshlagach, baho alohida keladi.
Qo'lda: `/retry_ID`.

## Vakansiya va savollarni o'zgartirish

Hammasi **`vacancies.json`** faylida (botni qayta ishga tushirish shart emas):

- `common_questions` — hamma lavozimlar uchun umumiy savollar (F.I.Sh., yosh, manzil, telefon...)
- `vacancies[].questions` — lavozimga xos savollar
- `final_questions` — oxirgi savollar (ish haqi, qachondan, ...)
- `vacancies[].requirements` — Claude shu talablar bo'yicha baholaydi

Savol formati:
```json
{ "id": "car", "section": "3. ҲУДУД ВА ТРАНСПОРТ", "label": "Шахсий транспорт",
  "text": "Шахсий автомобилингиз борми?", "type": "choice",
  "options": ["Автомобиль бор", "Йўқ"], "optional": false,
  "show_if": { "agent_exp": ["Ҳа, агент бўлиб ишлаганман"] } }
```
`type`: `text` | `number` | `phone` | `choice`. `show_if` — savol faqat oldingi javob shunday bo'lsa so'raladi.
Yangi lavozim qo'shish uchun `vacancies` ro'yxatiga yangi element qo'shing.

`anketalar/` papkasida har bir lavozim uchun chop etishga tayyor bo'sh anketa bor (botda admin `/blank` buyrug'i ham beradi).

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
| `NOTIFY_REJECTED` | Past ballilar haqida qisqa xabar (default `true`) |
| `RETRY_MINUTES` | AI ishlamasa necha daqiqada qayta urinish (default `60`) |
| `CLAUDE_TIMEOUT_SEC` | Bitta tahlil uchun maksimal kutish (default `180`) |


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

## Doimiy ishlatish

### A) Windows kompyuterda (bepul)
`hr-bot\windows\` papkasidagi fayllarni ikki marta bosib ishlatasiz:

| Fayl | Vazifa |
|---|---|
| `install-autostart.bat` | Botni fonda (oynasiz) ishga tushiradi va Windows yoqilganda avtomatik ishga tushadigan qiladi. To'xtab qolsa — 10 soniyada o'zi qayta yonadi |
| `stop-bot.bat` | Botni to'xtatadi |
| `uninstall-autostart.bat` | To'xtatadi va avtomatik ishga tushishni o'chiradi |
| `view-log.bat` | Bot logini ko'rsatadi (`data\bot.log`) |

Muhim: kompyuter **uyqu rejimiga o'tmasligi** kerak (Параметры → Система → Питание → Сон: **Никогда**),
va bir vaqtda faqat **bitta** bot nusxasi ishlashi kerak (VS Code terminalidagi `npm start` ni yoping).

### B) VPS serverda (Ubuntu 22.04/24.04, 24/7)
Serverga root bo'lib kiring (`ssh root@SERVER_IP`) va bitta buyruqni bajaring:
```bash
curl -fsSL https://raw.githubusercontent.com/muhammadaminuz/mdmn7x/claude/telegram-bot-yasash-llrwz7/hr-bot/deploy/setup-vps.sh | bash
```
Skript Node.js, Claude Code CLI va pm2 ni o'rnatadi, tokenlarni so'raydi, botni ishga tushiradi va server
qayta yoqilganda avtomatik ishga tushadigan qiladi. Yangilash uchun shu buyruqni yana bajaring.

## Admin buyruqlari

| Buyruq | Vazifa |
|---|---|
| `/stats` | Statistika |
| `/top` | Eng yuqori ballli 10 nomzod |
| `/recent` | Oxirgi 10 ariza |
| `/view_ID` | Nomzod kartasi, anketasi va fayllari |
| `/retry_ID` | AI tahlilni qayta bajarish |
| `/blank` | Barcha lavozimlar uchun bo'sh anketa (DOCX) |
| `/myid` | Telegram ID'ingizni ko'rish |

## Ma'lumotlar

Barcha arizalar `data/candidates.json` da, rezyume fayllari `data/resumes/<ID>/` da saqlanadi.

## Eslatmalar

- Tahlil obuna limitlaringizdan foydalanadi. Ko'p ariza kelsa, `ANALYSIS_CONCURRENCY=1` qoldiring — arizalar navbatda kutadi.
- Claude faqat `Read` vositasi bilan ishlaydi (faylni o'qish), Bash/internet/fayl yozish o'chirilgan.
- Obuna tokeni shaxsiy foydalanish uchun. Botni ko'pchilikka xizmat sifatida taqdim etmoqchi bo'lsangiz,
  Anthropic shartlariga ko'ra API kalitiga o'tish kerak bo'ladi.
