import fs from "fs";
import path from "path";
import crypto from "crypto";
import mammoth from "mammoth";
import { Bot, Context, InlineKeyboard, Keyboard } from "grammy";
import { config, loadVacancies, Vacancy } from "./config";
import { analyzeResume, createQueue, Analysis } from "./claude";
import { saveCandidate, listCandidates, getCandidate, candidateDir, CandidateRecord } from "./storage";

type Step = "name" | "phone" | "vacancy" | "resume";

interface Draft {
  step: Step;
  name?: string;
  phone?: string;
  vacancy?: Vacancy;
}

const drafts = new Map<number, Draft>();
const enqueue = createQueue(config.concurrency);
const bot = new Bot(config.botToken);

const MAX_FILE_BYTES = 20 * 1024 * 1024; // Telegram Bot API yuklab olish limiti
const TEXT_EXT = [".txt", ".md"];
const READ_EXT = [".pdf", ".jpg", ".jpeg", ".png", ".webp"];
const DOCX_EXT = [".docx"];

const isAdmin = (ctx: Context) => !!ctx.from && config.adminChatIds.includes(ctx.from.id);

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ───────────────────────── Nomzod oqimi ─────────────────────────

bot.command("start", async (ctx) => {
  drafts.set(ctx.from!.id, { step: "name" });
  const { company } = loadVacancies();
  await ctx.reply(
    `Assalomu alaykum! 👋\n<b>${esc(company)}</b> kompaniyasiga ishga ariza topshirish botiga xush kelibsiz.\n\n` +
      `Iltimos, <b>ism va familiyangizni</b> yozing:`,
    { parse_mode: "HTML", reply_markup: { remove_keyboard: true } },
  );
});

bot.command("cancel", async (ctx) => {
  drafts.delete(ctx.from!.id);
  await ctx.reply("Bekor qilindi. Qaytadan boshlash uchun /start bosing.", {
    reply_markup: { remove_keyboard: true },
  });
});

bot.on("message:contact", async (ctx, next) => {
  const draft = drafts.get(ctx.from.id);
  if (draft?.step !== "phone") return next();
  draft.phone = ctx.message.contact.phone_number;
  await askVacancy(ctx, draft);
});

bot.callbackQuery(/^vac:(.+)$/, async (ctx) => {
  const draft = drafts.get(ctx.from.id);
  const vacancy = loadVacancies().vacancies.find((v) => v.id === ctx.match[1]);
  await ctx.answerCallbackQuery();
  if (draft?.step !== "vacancy" || !vacancy) return;
  draft.vacancy = vacancy;
  draft.step = "resume";
  await ctx.editMessageText(`Lavozim: <b>${esc(vacancy.title)}</b> ✅`, { parse_mode: "HTML" });
  await ctx.reply(
    "Endi <b>rezyumengizni</b> yuboring 📄\n\n" +
      "Qabul qilinadi: PDF, DOCX, TXT fayl, rezyume rasmi (foto) yoki shunchaki matn ko'rinishida yozib yuborishingiz mumkin.",
    { parse_mode: "HTML" },
  );
});

bot.on("message:document", async (ctx, next) => {
  const draft = drafts.get(ctx.from.id);
  if (draft?.step !== "resume") return next();
  const doc = ctx.message.document;
  const ext = path.extname(doc.file_name ?? "").toLowerCase();
  if (![...TEXT_EXT, ...READ_EXT, ...DOCX_EXT].includes(ext)) {
    return ctx.reply("❗ Bu format qo'llab-quvvatlanmaydi. PDF, DOCX, TXT yoki rasm yuboring.");
  }
  if ((doc.file_size ?? 0) > MAX_FILE_BYTES) {
    return ctx.reply("❗ Fayl juda katta (20 MB dan oshmasin).");
  }
  await submit(ctx, draft, { fileId: doc.file_id, ext, kind: "document" });
});

bot.on("message:photo", async (ctx, next) => {
  const draft = drafts.get(ctx.from.id);
  if (draft?.step !== "resume") return next();
  const photo = ctx.message.photo[ctx.message.photo.length - 1];
  await submit(ctx, draft, { fileId: photo.file_id, ext: ".jpg", kind: "photo" });
});

bot.on("message:text", async (ctx) => {
  const text = ctx.message.text.trim();
  const draft = drafts.get(ctx.from.id);
  if (!draft) {
    return ctx.reply(isAdmin(ctx) ? adminHelp() : "Ariza topshirish uchun /start bosing.", { parse_mode: "HTML" });
  }

  switch (draft.step) {
    case "name":
      if (text.length < 3) return ctx.reply("Iltimos, to'liq ism-familiyangizni yozing.");
      draft.name = text;
      draft.step = "phone";
      return ctx.reply("📱 Telefon raqamingizni yuboring (pastdagi tugma orqali yoki yozib):", {
        reply_markup: new Keyboard().requestContact("📱 Raqamni yuborish").resized().oneTime(),
      });
    case "phone":
      if (!/^\+?[\d\s\-()]{9,}$/.test(text)) return ctx.reply("❗ Raqam noto'g'ri. Masalan: +998 90 123 45 67");
      draft.phone = text;
      return askVacancy(ctx, draft);
    case "vacancy":
      return ctx.reply("Iltimos, yuqoridagi ro'yxatdan lavozimni tanlang 👆");
    case "resume":
      if (text.length < 100) {
        return ctx.reply("Rezyume juda qisqa. Tajriba, ma'lumot va ko'nikmalaringizni batafsilroq yozing yoki fayl yuboring.");
      }
      return submit(ctx, draft, { text });
  }
});

async function askVacancy(ctx: Context, draft: Draft) {
  draft.step = "vacancy";
  const kb = new InlineKeyboard();
  for (const v of loadVacancies().vacancies) kb.text(v.title, `vac:${v.id}`).row();
  await ctx.reply("Rahmat! ✅", { reply_markup: { remove_keyboard: true } });
  await ctx.reply("💼 Qaysi lavozimga ariza topshirmoqchisiz?", { reply_markup: kb });
}

interface Upload {
  fileId?: string;
  ext?: string;
  kind?: "document" | "photo";
  text?: string;
}

async function submit(ctx: Context, draft: Draft, upload: Upload) {
  const from = ctx.from!;
  drafts.delete(from.id);

  const record: CandidateRecord = {
    id: crypto.randomBytes(4).toString("hex"),
    telegramId: from.id,
    username: from.username,
    name: draft.name!,
    phone: draft.phone!,
    vacancyId: draft.vacancy!.id,
    vacancyTitle: draft.vacancy!.title,
    createdAt: new Date().toISOString(),
    status: "pending",
  };
  if (upload.fileId) record.resumeFile = `${upload.kind}:${upload.fileId}`;
  saveCandidate(record);

  await ctx.reply(
    "✅ Arizangiz qabul qilindi! Rezyumengiz ko'rib chiqilmoqda.\nMos kelsangiz, tez orada siz bilan bog'lanamiz. Rahmat!",
  );

  // Tahlil fonda — foydalanuvchi kutib qolmaydi
  void processCandidate(record, draft.vacancy!, upload).catch((err) => console.error("process error", err));
}

async function processCandidate(record: CandidateRecord, vacancy: Vacancy, upload: Upload) {
  const dir = candidateDir(record.id);
  try {
    let text = upload.text;
    let filePath: string | undefined;

    if (upload.fileId) {
      const local = path.join(dir, `resume${upload.ext}`);
      await download(upload.fileId, local);
      if (TEXT_EXT.includes(upload.ext!)) text = fs.readFileSync(local, "utf8");
      else if (DOCX_EXT.includes(upload.ext!)) text = (await mammoth.extractRawText({ path: local })).value;
      else filePath = path.basename(local);
    } else if (text) {
      fs.writeFileSync(path.join(dir, "resume.txt"), text);
    }

    const company = loadVacancies();
    const analysis = await enqueue(() =>
      analyzeResume(record, vacancy, company, { text, filePath, workDir: dir }),
    );
    record.status = "analyzed";
    record.analysis = analysis;
    saveCandidate(record);
    console.log(`[${record.id}] ${record.name} — ${analysis.score} (${analysis.verdict})`);

    if (analysis.score >= config.minScore) await notifyAdmins(record, analysis);
    else if (config.notifyRejected) await notifyAdminsShort(record, analysis);
  } catch (err) {
    record.status = "error";
    record.error = String(err);
    saveCandidate(record);
    console.error(`[${record.id}] tahlil xatosi:`, err);
    for (const id of config.adminChatIds) {
      await bot.api
        .sendMessage(id, `⚠️ Nomzod <b>${esc(record.name)}</b> rezyumesini tahlil qilib bo'lmadi.\n/retry_${record.id}\n<code>${esc(String(err).slice(0, 300))}</code>`, { parse_mode: "HTML" })
        .catch(() => {});
    }
  }
}

async function download(fileId: string, dest: string) {
  const file = await bot.api.getFile(fileId);
  const res = await fetch(`https://api.telegram.org/file/bot${config.botToken}/${file.file_path}`);
  if (!res.ok) throw new Error(`Faylni yuklab bo'lmadi: ${res.status}`);
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

// ───────────────────────── Admin xabarlari ─────────────────────────

const VERDICT: Record<Analysis["verdict"], string> = {
  recommended: "🟢 Tavsiya etiladi",
  maybe: "🟡 Ko'rib chiqish mumkin",
  rejected: "🔴 Mos emas",
};

function formatCard(r: CandidateRecord, a: Analysis): string {
  const list = (items: string[]) => items.map((s) => `• ${esc(s)}`).join("\n");
  const contact = r.username ? `@${esc(r.username)}` : `<a href="tg://user?id=${r.telegramId}">profil</a>`;
  return (
    `⭐️ <b>Yangi nomzod — ${a.score}/100</b>  ${VERDICT[a.verdict]}\n\n` +
    `👤 <b>${esc(r.name)}</b>\n📱 ${esc(r.phone)}\n💬 ${contact}\n💼 ${esc(r.vacancyTitle)}\n` +
    `⏳ Tajriba: ~${a.experience_years} yil\n\n` +
    `📝 <b>Xulosa:</b>\n${esc(a.summary)}\n\n` +
    `✅ <b>Kuchli tomonlari:</b>\n${list(a.strengths)}\n\n` +
    `⚠️ <b>Zaif tomonlari:</b>\n${list(a.weaknesses)}\n\n` +
    `❓ <b>Suhbat uchun savollar:</b>\n${list(a.interview_questions)}\n\n` +
    `ID: <code>${r.id}</code>`
  ).slice(0, 4000);
}

async function sendResumeFile(chatId: number, r: CandidateRecord) {
  if (!r.resumeFile) {
    const txt = path.join(config.dataDir, "resumes", r.id, "resume.txt");
    if (fs.existsSync(txt)) {
      await bot.api.sendMessage(chatId, `📄 Rezyume matni:\n\n${fs.readFileSync(txt, "utf8").slice(0, 3900)}`);
    }
    return;
  }
  const [kind, fileId] = r.resumeFile.split(":");
  if (kind === "photo") await bot.api.sendPhoto(chatId, fileId);
  else await bot.api.sendDocument(chatId, fileId);
}

async function notifyAdmins(r: CandidateRecord, a: Analysis) {
  for (const id of config.adminChatIds) {
    try {
      await bot.api.sendMessage(id, formatCard(r, a), { parse_mode: "HTML" });
      await sendResumeFile(id, r);
    } catch (err) {
      console.error(`Adminga (${id}) yuborib bo'lmadi:`, err);
    }
  }
}

async function notifyAdminsShort(r: CandidateRecord, a: Analysis) {
  for (const id of config.adminChatIds) {
    await bot.api
      .sendMessage(id, `▫️ ${esc(r.name)} — ${esc(r.vacancyTitle)} — <b>${a.score}/100</b>\n/view_${r.id}`, { parse_mode: "HTML" })
      .catch(() => {});
  }
}

// ───────────────────────── Admin buyruqlari ─────────────────────────

function adminHelp() {
  return (
    `<b>Admin buyruqlari:</b>\n` +
    `/stats — umumiy statistika\n` +
    `/top — eng yaxshi 10 nomzod\n` +
    `/recent — oxirgi 10 ariza\n` +
    `/view_ID — nomzod kartasi va rezyumesi\n` +
    `/retry_ID — tahlilni qayta bajarish\n\n` +
    `Minimal ball: <b>${config.minScore}</b>`
  );
}

bot.command("help", (ctx) => ctx.reply(isAdmin(ctx) ? adminHelp() : "Ariza topshirish uchun /start bosing.", { parse_mode: "HTML" }));

bot.command("myid", (ctx) => ctx.reply(`Sizning Telegram ID: <code>${ctx.from!.id}</code>`, { parse_mode: "HTML" }));

bot.command("stats", async (ctx) => {
  if (!isAdmin(ctx)) return;
  const all = listCandidates();
  const analyzed = all.filter((r) => r.analysis);
  const passed = analyzed.filter((r) => r.analysis!.score >= config.minScore);
  const avg = analyzed.length ? Math.round(analyzed.reduce((s, r) => s + r.analysis!.score, 0) / analyzed.length) : 0;
  await ctx.reply(
    `📊 Jami arizalar: <b>${all.length}</b>\n` +
      `Tahlil qilingan: <b>${analyzed.length}</b>\n` +
      `Saralangan (≥${config.minScore}): <b>${passed.length}</b>\n` +
      `Kutilmoqda: <b>${all.filter((r) => r.status === "pending").length}</b>\n` +
      `Xato: <b>${all.filter((r) => r.status === "error").length}</b>\n` +
      `O'rtacha ball: <b>${avg}</b>`,
    { parse_mode: "HTML" },
  );
});

function shortList(records: CandidateRecord[]) {
  if (!records.length) return "Hozircha nomzodlar yo'q.";
  return records
    .map((r) => `${r.analysis ? `<b>${r.analysis.score}</b>` : "—"} | ${esc(r.name)} — ${esc(r.vacancyTitle)}\n/view_${r.id}`)
    .join("\n\n");
}

bot.command("top", async (ctx) => {
  if (!isAdmin(ctx)) return;
  const top = listCandidates()
    .filter((r) => r.analysis)
    .sort((a, b) => b.analysis!.score - a.analysis!.score)
    .slice(0, 10);
  await ctx.reply(`🏆 <b>Eng yaxshi nomzodlar</b>\n\n${shortList(top)}`, { parse_mode: "HTML" });
});

bot.command("recent", async (ctx) => {
  if (!isAdmin(ctx)) return;
  const recent = listCandidates().slice(-10).reverse();
  await ctx.reply(`🕒 <b>Oxirgi arizalar</b>\n\n${shortList(recent)}`, { parse_mode: "HTML" });
});

bot.hears(/^\/view_([a-f0-9]+)/, async (ctx) => {
  if (!isAdmin(ctx)) return;
  const r = getCandidate(ctx.match[1]);
  if (!r) return ctx.reply("Topilmadi.");
  if (r.analysis) await ctx.reply(formatCard(r, r.analysis), { parse_mode: "HTML" });
  else await ctx.reply(`${r.name} — holat: ${r.status}`);
  await sendResumeFile(ctx.chat.id, r);
});

bot.hears(/^\/retry_([a-f0-9]+)/, async (ctx) => {
  if (!isAdmin(ctx)) return;
  const r = getCandidate(ctx.match[1]);
  const vacancy = r && loadVacancies().vacancies.find((v) => v.id === r.vacancyId);
  if (!r || !vacancy) return ctx.reply("Topilmadi.");
  await ctx.reply("🔄 Qayta tahlil boshlandi...");
  const dir = candidateDir(r.id);
  const saved = fs.readdirSync(dir).find((f) => f.startsWith("resume"));
  const upload: Upload = {};
  if (saved?.endsWith(".txt") && !r.resumeFile) upload.text = fs.readFileSync(path.join(dir, saved), "utf8");
  else if (r.resumeFile) {
    const [kind, fileId] = r.resumeFile.split(":");
    upload.kind = kind as Upload["kind"];
    upload.fileId = fileId;
    upload.ext = saved ? path.extname(saved) : ".jpg";
  }
  r.status = "pending";
  saveCandidate(r);
  void processCandidate(r, vacancy, upload);
});

// ───────────────────────── Ishga tushirish ─────────────────────────

bot.catch((err) => console.error("Bot xatosi:", err.error));

bot.api
  .setMyCommands([
    { command: "start", description: "Ariza topshirish" },
    { command: "cancel", description: "Bekor qilish" },
  ])
  .catch(() => {});

bot.start({ onStart: (me) => console.log(`🤖 @${me.username} ishga tushdi. Adminlar: ${config.adminChatIds.join(", ")}`) });
