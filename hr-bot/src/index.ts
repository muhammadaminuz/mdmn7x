import fs from "fs";
import path from "path";
import crypto from "crypto";
import mammoth from "mammoth";
import { Bot, Context, InlineKeyboard, InputFile, Keyboard } from "grammy";
import { config, loadVacancies, questionsFor, isVisible, Question, VacanciesFile, Vacancy } from "./config";
import { analyzeCandidate, createQueue, Analysis } from "./claude";
import { buildAnketa } from "./anketa";
import { saveCandidate, listCandidates, getCandidate, candidateDir, CandidateRecord, StoredFile } from "./storage";

// ───────────────────────── Ҳолат ─────────────────────────

interface Draft {
  step: "vacancy" | "mode" | "q" | "files" | "confirm";
  vacancyId?: string;
  mode: "form" | "file";
  answers: Record<string, string>;
  history: string[]; // жавоб берилган саволлар тартиби ("Орқага" учун)
  current?: string; // ҳозир берилган савол id си
  files: StoredFile[];
  texts: string[];
  ackedGroups: string[]; // расм альбомлари учун битта жавоб
}

const drafts = new Map<number, Draft>();
const enqueue = createQueue(config.concurrency);
const bot = new Bot(config.botToken);

const BTN_BACK = "⬅️ Орқага";
const BTN_SKIP = "⏭ Ўтказиб юбориш";
const BTN_SEND = "✅ Юбориш";
const MAX_FILES = 10;
const MAX_ATTEMPTS = 24; // ~1 кун (RETRY_MINUTES=60 да)
const MAX_FILE_BYTES = 20 * 1024 * 1024; // Telegram Bot API юклаб олиш чегараси

const TEXT_EXT = [".txt", ".md", ".csv", ".html", ".htm", ".rtf"];
const READ_EXT = [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".gif"]; // Claude Read воситаси ўқийди

const isAdmin = (ctx: Context) => !!ctx.from && config.adminChatIds.includes(ctx.from.id);
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const today = () => new Date().toLocaleDateString("ru-RU");

function vacancyOf(file: VacanciesFile, id?: string): Vacancy | undefined {
  return file.vacancies.find((v) => v.id === id);
}

/** Жорий режимдаги саволлар рўйхати (файл режимида фақат исм ва телефон). */
function draftQuestions(file: VacanciesFile, draft: Draft): Question[] {
  const all = questionsFor(file, vacancyOf(file, draft.vacancyId)!);
  return draft.mode === "form" ? all : all.filter((q) => file.file_mode_questions.includes(q.id));
}

// ───────────────────────── Бошланиш ─────────────────────────

bot.command("start", async (ctx) => {
  const file = loadVacancies();
  drafts.set(ctx.from!.id, { step: "vacancy", mode: "form", answers: {}, history: [], files: [], texts: [], ackedGroups: [] });
  const kb = new InlineKeyboard();
  file.vacancies.forEach((v, i) => (i ? kb.row() : kb).text(v.title, `vac:${v.id}`));
  await ctx.reply(
    `Ассалому алайкум! 👋\n<b>«${esc(file.company)}»</b> — ${esc(file.about)}.\n\n` +
      `Ишга ариза топшириш учун аввал лавозимни танланг 👇`,
    { parse_mode: "HTML", reply_markup: { remove_keyboard: true } },
  );
  await ctx.reply("💼 Қайси лавозимга ариза топширмоқчисиз?", { reply_markup: kb });
});

bot.command("cancel", async (ctx) => {
  drafts.delete(ctx.from!.id);
  await ctx.reply("Бекор қилинди. Қайтадан бошлаш учун /start босинг.", { reply_markup: { remove_keyboard: true } });
});

bot.callbackQuery(/^vac:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const draft = drafts.get(ctx.from.id);
  const vacancy = vacancyOf(loadVacancies(), ctx.match[1]);
  if (draft?.step !== "vacancy" || !vacancy) return;
  draft.vacancyId = vacancy.id;
  draft.step = "mode";
  await ctx.editMessageText(`💼 Лавозим: <b>${esc(vacancy.title)}</b> ✅`, { parse_mode: "HTML" });
  await ctx.reply("Маълумотларингизни қандай юборасиз?", {
    reply_markup: new InlineKeyboard()
      .text("📝 Саволларга жавоб бериш (тавсия)", "mode:form").row()
      .text("📎 Тайёр резюме / анкета юбориш", "mode:file").row()
      .text("📄 Бўш анкета бланкасини олиш", "mode:blank"),
  });
});

bot.callbackQuery(/^mode:(form|file|blank)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const draft = drafts.get(ctx.from.id);
  if (draft?.step !== "mode") return;
  const file = loadVacancies();
  const vacancy = vacancyOf(file, draft.vacancyId)!;
  const choice = ctx.match[1];
  await ctx.editMessageReplyMarkup();

  if (choice === "blank") {
    const buf = await buildAnketa(file, vacancy);
    await ctx.replyWithDocument(new InputFile(buf, `Anketa_${vacancy.id}.docx`), {
      caption: "📄 Анкета бланкаси. Уни тўлдириб, файл ёки расм (сурат) кўринишида шу ерга юборинг.",
    });
  }
  draft.mode = choice === "form" ? "form" : "file";
  draft.step = "q";
  await ctx.reply(
    draft.mode === "form"
      ? "Яхши! Бир нечта саволга жавоб беринг. Тугмалардан танлашингиз ёки ўзингиз ёзишингиз мумкин.\nБекор қилиш: /cancel"
      : "Яхши! Аввал исм ва телефонингизни ёзинг, кейин резюме/анкетани юборасиз.",
  );
  await askNext(ctx, draft);
});

// ───────────────────────── Саволлар ─────────────────────────

/** Кўринадиган ва ҳали жавоб берилмаган биринчи саволни беради; қолмаган бўлса кейинги босқичга ўтади. */
async function askNext(ctx: Context, draft: Draft) {
  const file = loadVacancies();
  const qs = draftQuestions(file, draft);
  const visible = qs.filter((q) => isVisible(q, draft.answers));
  const next = visible.find((q) => !(q.id in draft.answers));

  if (!next) {
    draft.current = undefined;
    return draft.mode === "form" ? showConfirm(ctx, draft) : askFiles(ctx, draft);
  }

  draft.step = "q";
  draft.current = next.id;
  const kb = new Keyboard();
  if (next.type === "choice") for (const o of next.options ?? []) kb.text(o).row();
  if (next.type === "phone") kb.requestContact("📱 Рақамни юбориш").row();
  if (next.optional) kb.text(BTN_SKIP);
  if (draft.history.length) kb.text(BTN_BACK);

  const n = visible.indexOf(next) + 1;
  await ctx.reply(`<b>(${n}/${visible.length})</b> ${esc(next.text)}`, {
    parse_mode: "HTML",
    reply_markup: kb.build().length ? kb.resized() : { remove_keyboard: true },
  });
}

async function handleAnswer(ctx: Context, draft: Draft, raw: string) {
  const file = loadVacancies();
  const q = draftQuestions(file, draft).find((x) => x.id === draft.current);
  if (!q) return askNext(ctx, draft);

  if (raw === BTN_BACK) {
    const prev = draft.history.pop();
    if (prev) delete draft.answers[prev];
    return askNext(ctx, draft);
  }

  let value = raw.trim();
  if (raw === BTN_SKIP && q.optional) value = "";
  else if (q.type === "phone" && !/^\+?[\d\s\-()]{9,}$/.test(value)) {
    return ctx.reply("❗ Рақам нотўғри. Масалан: +998 90 123 45 67");
  } else if (q.type === "number") {
    const n = parseInt(value, 10);
    if (Number.isNaN(n) || n < 14 || n > 80) return ctx.reply("❗ Илтимос, ёшингизни рақамда ёзинг. Масалан: 25");
    value = String(n);
  } else if (q.type === "text" && value.length < 2) {
    return ctx.reply("❗ Илтимос, батафсилроқ ёзинг.");
  }

  draft.answers[q.id] = value.slice(0, 1500);
  draft.history.push(q.id);
  await askNext(ctx, draft);
}

function answeredList(file: VacanciesFile, draft: Draft) {
  return questionsFor(file, vacancyOf(file, draft.vacancyId)!)
    .filter((q) => isVisible(q, draft.answers) && draft.answers[q.id])
    .map((q) => ({ q, value: draft.answers[q.id] }));
}

async function showConfirm(ctx: Context, draft: Draft) {
  draft.step = "confirm";
  const file = loadVacancies();
  const vacancy = vacancyOf(file, draft.vacancyId)!;
  const lines = answeredList(file, draft).map(({ q, value }) => `<b>${esc(q.label)}:</b> ${esc(value)}`);
  await ctx.reply("Раҳмат! Маълумотларингизни текширинг 👇", { reply_markup: { remove_keyboard: true } });
  await ctx.reply(`📋 <b>${esc(vacancy.title)}</b>\n\n${lines.join("\n")}`.slice(0, 4000), {
    parse_mode: "HTML",
    reply_markup: new InlineKeyboard()
      .text("✅ Тўғри, юбориш", "confirm").row()
      .text("✏️ Таҳрирлаш", "edit").text("🔄 Бошидан", "restart"),
  });
}

bot.callbackQuery("confirm", async (ctx) => {
  await ctx.answerCallbackQuery();
  const draft = drafts.get(ctx.from.id);
  if (draft?.step !== "confirm") return;
  await ctx.editMessageReplyMarkup();
  await submit(ctx, draft);
});

bot.callbackQuery("restart", async (ctx) => {
  await ctx.answerCallbackQuery();
  const draft = drafts.get(ctx.from.id);
  if (draft?.step !== "confirm") return;
  await ctx.editMessageReplyMarkup();
  draft.answers = {};
  draft.history = [];
  await askNext(ctx, draft);
});

bot.callbackQuery("edit", async (ctx) => {
  await ctx.answerCallbackQuery();
  const draft = drafts.get(ctx.from.id);
  if (draft?.step !== "confirm") return;
  const kb = new InlineKeyboard();
  answeredList(loadVacancies(), draft).forEach(({ q }, i) => (i % 2 === 0 && i ? kb.row() : kb).text(q.label, `edit:${q.id}`));
  await ctx.editMessageReplyMarkup({ reply_markup: kb.row().text("⬅️ Орқага", "edit_back") });
});

bot.callbackQuery("edit_back", async (ctx) => {
  await ctx.answerCallbackQuery();
  const draft = drafts.get(ctx.from.id);
  if (draft?.step !== "confirm") return;
  await ctx.editMessageReplyMarkup({
    reply_markup: new InlineKeyboard().text("✅ Тўғри, юбориш", "confirm").row().text("✏️ Таҳрирлаш", "edit").text("🔄 Бошидан", "restart"),
  });
});

bot.callbackQuery(/^edit:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const draft = drafts.get(ctx.from.id);
  if (draft?.step !== "confirm") return;
  await ctx.editMessageReplyMarkup();
  delete draft.answers[ctx.match[1]];
  draft.history = draft.history.filter((id) => id !== ctx.match[1]);
  await askNext(ctx, draft); // жавоб берилгач, янги очилган саволлар бўлса — улар, бўлмаса яна текшириш
});

// ───────────────────────── Файл / тайёр резюме ─────────────────────────

async function askFiles(ctx: Context, draft: Draft) {
  draft.step = "files";
  await ctx.reply(
    "📎 Энди резюме ёки тўлдирилган анкетангизни юборинг.\n\n" +
      "Исталган формат: PDF, Word (DOC/DOCX), TXT, расм/сурат (бир нечта бўлиши мумкин) ёки шунчаки матн кўринишида ёзинг.\n\n" +
      `Ҳаммасини юбориб бўлгач, <b>${BTN_SEND}</b> тугмасини босинг.`,
    { parse_mode: "HTML", reply_markup: new Keyboard().text(BTN_SEND).resized() },
  );
}

async function addFile(ctx: Context, draft: Draft, f: Omit<StoredFile, "name">, ext: string) {
  if (draft.files.length >= MAX_FILES) return ctx.reply(`❗ Кўпи билан ${MAX_FILES} та файл. ${BTN_SEND} ни босинг.`);
  draft.files.push({ ...f, name: `file_${draft.files.length + 1}${ext || ".bin"}` });
  const group = ctx.message?.media_group_id;
  if (group) {
    if (draft.ackedGroups.includes(group)) return;
    draft.ackedGroups.push(group);
  }
  await ctx.reply(`✅ Қабул қилинди. Яна юборишингиз ёки <b>${BTN_SEND}</b> ни босишингиз мумкин.`, { parse_mode: "HTML" });
}

bot.on("message:document", async (ctx, next) => {
  const draft = drafts.get(ctx.from.id);
  if (draft?.step !== "files") return next();
  const doc = ctx.message.document;
  if ((doc.file_size ?? 0) > MAX_FILE_BYTES) return ctx.reply("❗ Файл жуда катта (20 МБ дан ошмасин).");
  await addFile(ctx, draft, { kind: "document", fileId: doc.file_id }, path.extname(doc.file_name ?? "").toLowerCase());
});

bot.on("message:photo", async (ctx, next) => {
  const draft = drafts.get(ctx.from.id);
  if (draft?.step !== "files") return next();
  const photo = ctx.message.photo[ctx.message.photo.length - 1];
  await addFile(ctx, draft, { kind: "photo", fileId: photo.file_id }, ".jpg");
});

bot.on("message:contact", async (ctx, next) => {
  const draft = drafts.get(ctx.from.id);
  const q = draft?.current && draft.step === "q" ? draft.current : undefined;
  if (!draft || !q) return next();
  await handleAnswer(ctx, draft, ctx.message.contact.phone_number);
});

bot.on("message:text", async (ctx, next) => {
  const text = ctx.message.text;
  if (text.startsWith("/")) return next();
  const draft = drafts.get(ctx.from.id);
  if (!draft) {
    return ctx.reply(isAdmin(ctx) ? adminHelp() : "Ишга ариза топшириш учун /start босинг.", { parse_mode: "HTML" });
  }
  switch (draft.step) {
    case "vacancy":
    case "mode":
      return ctx.reply("Илтимос, юқоридаги тугмалардан бирини танланг 👆");
    case "confirm":
      return ctx.reply("Илтимос, маълумотларни тасдиқланг ёки таҳрирланг 👆");
    case "q":
      return handleAnswer(ctx, draft, text);
    case "files":
      if (text === BTN_SEND) {
        if (!draft.files.length && !draft.texts.length) return ctx.reply("❗ Ҳали ҳеч нарса юбормадингиз.");
        return submit(ctx, draft);
      }
      if (text.trim().length < 30) return ctx.reply("Резюме жуда қисқа — батафсилроқ ёзинг ёки файл юборинг.");
      draft.texts.push(text.slice(0, 20_000));
      return ctx.reply(`✅ Қабул қилинди. Тайёр бўлса <b>${BTN_SEND}</b> ни босинг.`, { parse_mode: "HTML" });
  }
});

// ───────────────────────── Юбориш ва таҳлил ─────────────────────────

async function submit(ctx: Context, draft: Draft) {
  const from = ctx.from!;
  drafts.delete(from.id);
  const file = loadVacancies();
  const vacancy = vacancyOf(file, draft.vacancyId)!;
  const answers = Object.fromEntries(answeredList(file, draft).map(({ q, value }) => [q.id, value]));

  const record: CandidateRecord = {
    id: crypto.randomBytes(4).toString("hex"),
    telegramId: from.id,
    username: from.username,
    name: answers.full_name ?? from.first_name,
    phone: answers.phone ?? "",
    vacancyId: vacancy.id,
    vacancyTitle: vacancy.title,
    mode: draft.mode,
    answers,
    files: draft.files,
    texts: draft.texts,
    createdAt: new Date().toISOString(),
    status: "pending",
  };
  saveCandidate(record);

  await ctx.reply(
    "✅ Аризангиз қабул қилинди! Раҳмат.\nМаълумотларингиз кўриб чиқилмоқда, мос келсангиз тез орада сиз билан боғланамиз.",
    { reply_markup: { remove_keyboard: true } },
  );
  void processCandidate(record).catch((err) => console.error("process error", err));
}

async function processCandidate(record: CandidateRecord) {
  const dir = candidateDir(record.id);
  record.status = "pending"; // таҳлил давомида такрорий уриниш бошланмаслиги учун
  saveCandidate(record);
  try {
    const file = loadVacancies();
    const vacancy = vacancyOf(file, record.vacancyId);
    if (!vacancy) throw new Error(`Лавозим топилмади: ${record.vacancyId}`);

    const texts = [...record.texts];
    const filePaths: string[] = [];
    for (const f of record.files) {
      const local = path.join(dir, f.name);
      if (!fs.existsSync(local)) await download(f.fileId, local);
      const ext = path.extname(f.name);
      if (READ_EXT.includes(ext)) filePaths.push(f.name);
      else if (ext === ".docx") texts.push((await mammoth.extractRawText({ path: local })).value);
      else texts.push(extractAnyText(fs.readFileSync(local), ext));
    }

    const all = questionsFor(file, vacancy);
    const analysis = await enqueue(() =>
      analyzeCandidate(vacancy, file, {
        answers: all.filter((q) => record.answers[q.id]).map((q) => ({ label: q.label, value: record.answers[q.id] })),
        texts: texts.filter((t) => t.trim()),
        filePaths,
        extractFields: record.mode === "file" ? all.filter((q) => !record.answers[q.id]) : undefined,
        workDir: dir,
      }),
    );

    // Файл режимида резюмедан ажратиб олинган жавоблар анкетага қўшилади
    for (const [id, value] of Object.entries(analysis.profile ?? {})) {
      if (value?.trim() && !record.answers[id]) record.answers[id] = value.trim();
    }
    record.status = "analyzed";
    record.analysis = analysis;
    saveCandidate(record);
    console.log(`[${record.id}] ${record.name} — ${analysis.score} (${analysis.verdict})`);

    if (analysis.score >= config.minScore) {
      for (const id of config.adminChatIds) await sendFull(id, record).catch((e) => console.error(`Админга (${id}):`, e));
    } else if (config.notifyRejected) {
      for (const id of config.adminChatIds) {
        await bot.api
          .sendMessage(id, `▫️ ${esc(record.name)} — ${esc(record.vacancyTitle)} — <b>${analysis.score}/100</b> (паст)\n/view_${record.id}`, { parse_mode: "HTML" })
          .catch(() => {});
      }
    }
  } catch (err) {
    record.status = "error";
    record.error = String(err);
    record.attempts = (record.attempts ?? 0) + 1;
    saveCandidate(record);
    console.error(`[${record.id}] таҳлил хатоси (${record.attempts}):`, err);
    // AI ишламаса ҳам (лимит/токен тугаган) маълумотлар админга биринчи уринишдаёқ етиб боради
    if (record.attempts === 1) {
      for (const id of config.adminChatIds) {
        await bot.api
          .sendMessage(id, `⚠️ AI таҳлил қилинмади (Claude лимити тугаган бўлиши мумкин). Маълумотлар таҳлилсиз юборилмоқда — AI қайта ишлагач, баҳоси алоҳида келади.
<code>${esc(String(err).slice(0, 200))}</code>`, { parse_mode: "HTML" })
          .catch(() => {});
        await sendFull(id, record).catch((e) => console.error(`Админга (${id}):`, e));
      }
    }
  }
}

/** Таҳлил қилинмай қолган аризаларни вақти-вақти билан қайта уриниб кўради (лимит қайта тиклангач). */
setInterval(() => {
  for (const r of listCandidates()) {
    if (r.status === "error" && (r.attempts ?? 0) < MAX_ATTEMPTS) void processCandidate(r).catch(() => {});
  }
}, config.retryMinutes * 60_000);

async function download(fileId: string, dest: string) {
  const f = await bot.api.getFile(fileId);
  const res = await fetch(`https://api.telegram.org/file/bot${config.botToken}/${f.file_path}`);
  if (!res.ok) throw new Error(`Файлни юклаб бўлмади: ${res.status}`);
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

/** DOC, RTF, HTML ва бошқа форматлардан ўқиладиган матнни ажратиб олади. */
function extractAnyText(buf: Buffer, ext: string): string {
  const utf8 = buf.toString("utf8");
  const broken = (utf8.match(/�/g)?.length ?? 0) / Math.max(1, utf8.length);
  if (TEXT_EXT.includes(ext) || broken < 0.02) {
    let t = utf8;
    if (ext === ".html" || ext === ".htm") t = t.replace(/<[^>]+>/g, " ");
    if (t.startsWith("{\\rtf")) t = t.replace(/\\'[0-9a-f]{2}|\\[a-z]+-?\d* ?|[{}]/gi, "");
    return t.replace(/[ \t]+/g, " ").trim();
  }
  // Эски Word (.doc) матнни UTF-16 да сақлайди
  const runs = [buf.toString("utf16le"), buf.toString("latin1")]
    .flatMap((s) => s.match(/[\p{L}\p{N}][\p{L}\p{N}\p{P}\p{Zs}]{5,}/gu) ?? [])
    .filter((r) => (r.match(/\p{L}/gu)?.length ?? 0) / r.length > 0.6);
  return runs.join("\n").slice(0, 40_000);
}

// ───────────────────────── Админга юбориш ─────────────────────────

const VERDICT: Record<Analysis["verdict"], string> = {
  recommended: "🟢 Тавсия этилади",
  maybe: "🟡 Кўриб чиқиш мумкин",
  rejected: "🔴 Мос эмас",
};

function formatCard(r: CandidateRecord, a: Analysis): string {
  const list = (items: string[]) => items.map((s) => `• ${esc(s)}`).join("\n");
  return (
    `⭐️ <b>Номзод — ${a.score}/100</b>  ${VERDICT[a.verdict]}\n\n` +
    `👤 <b>${esc(r.name)}</b>\n📱 ${esc(r.phone)}\n💬 ${contactLink(r)}\n💼 ${esc(r.vacancyTitle)}\n` +
    `⏳ Тажриба: ~${a.experience_years} йил\n\n` +
    `📝 <b>Хулоса:</b>\n${esc(a.summary)}\n\n` +
    `✅ <b>Кучли томонлари:</b>\n${list(a.strengths)}\n\n` +
    `⚠️ <b>Заиф томонлари:</b>\n${list(a.weaknesses)}\n\n` +
    `❓ <b>Суҳбат учун саволлар:</b>\n${list(a.interview_questions)}\n\n` +
    `ID: <code>${r.id}</code>`
  ).slice(0, 4000);
}

function contactLink(r: CandidateRecord) {
  return r.username ? `@${esc(r.username)}` : `<a href="tg://user?id=${r.telegramId}">профил</a>`;
}

/** AI таҳлилисиз карта: номзод маълумотлари ва анкета жавоблари. */
function formatPlain(r: CandidateRecord): string {
  const vacancy = vacancyOf(loadVacancies(), r.vacancyId);
  const qs = vacancy ? questionsFor(loadVacancies(), vacancy) : [];
  const lines = qs.filter((q) => r.answers[q.id]).map((q) => `<b>${esc(q.label)}:</b> ${esc(r.answers[q.id])}`);
  return (
    `🆕 <b>Янги ариза</b> (AI таҳлилисиз)\n\n` +
    `👤 <b>${esc(r.name)}</b>\n📱 ${esc(r.phone)}\n💬 ${contactLink(r)}\n💼 ${esc(r.vacancyTitle)}\n\n` +
    (lines.length ? lines.join("\n") + "\n\n" : "") +
    `/retry_${r.id} — AI таҳлилни қайта ишга тушириш\nID: <code>${r.id}</code>`
  ).slice(0, 4000);
}

async function sendFull(chatId: number, r: CandidateRecord) {
  const file = loadVacancies();
  const vacancy = vacancyOf(file, r.vacancyId);
  if (r.analysis) await bot.api.sendMessage(chatId, formatCard(r, r.analysis), { parse_mode: "HTML" });
  else await bot.api.sendMessage(chatId, formatPlain(r), { parse_mode: "HTML" });

  if (vacancy) {
    const buf = await buildAnketa(file, vacancy, r.answers, { score: r.analysis?.score, date: new Date(r.createdAt).toLocaleDateString("ru-RU") });
    const safeName = r.name.replace(/[^\p{L}\p{N}]+/gu, "_").slice(0, 40);
    await bot.api.sendDocument(chatId, new InputFile(buf, `Anketa_${safeName}.docx`), { caption: "📋 Тўлдирилган анкета" });
  }
  for (const f of r.files) {
    if (f.kind === "photo") await bot.api.sendPhoto(chatId, f.fileId);
    else await bot.api.sendDocument(chatId, f.fileId);
  }
  for (const t of r.texts) await bot.api.sendMessage(chatId, `📄 Номзод ёзган резюме:\n\n${t.slice(0, 3900)}`);
}

// ───────────────────────── Админ буйруқлари ─────────────────────────

function adminHelp() {
  return (
    `<b>Админ буйруқлари:</b>\n` +
    `/stats — умумий статистика\n` +
    `/top — энг яхши 10 номзод\n` +
    `/recent — охирги 10 ариза\n` +
    `/view_ID — номзод картаси, анкетаси ва файллари\n` +
    `/retry_ID — таҳлилни қайта бажариш\n` +
    `/blank — бўш анкета бланкалари (чоп этиш учун)\n\n` +
    `Минимал балл: <b>${config.minScore}</b>`
  );
}

bot.command("help", (ctx) => ctx.reply(isAdmin(ctx) ? adminHelp() : "Ишга ариза топшириш учун /start босинг.", { parse_mode: "HTML" }));

bot.command("myid", (ctx) => ctx.reply(`Сизнинг Telegram ID: <code>${ctx.from!.id}</code>`, { parse_mode: "HTML" }));

bot.command("stats", async (ctx) => {
  if (!isAdmin(ctx)) return;
  const all = listCandidates();
  const analyzed = all.filter((r) => r.analysis);
  const passed = analyzed.filter((r) => r.analysis!.score >= config.minScore);
  const avg = analyzed.length ? Math.round(analyzed.reduce((s, r) => s + r.analysis!.score, 0) / analyzed.length) : 0;
  const byVacancy = new Map<string, number>();
  for (const r of all) byVacancy.set(r.vacancyTitle, (byVacancy.get(r.vacancyTitle) ?? 0) + 1);
  await ctx.reply(
    `📊 Жами аризалар: <b>${all.length}</b>\n` +
      `Таҳлил қилинган: <b>${analyzed.length}</b>\n` +
      `Сараланган (≥${config.minScore}): <b>${passed.length}</b>\n` +
      `Кутилмоқда: <b>${all.filter((r) => r.status === "pending").length}</b>\n` +
      `Хато: <b>${all.filter((r) => r.status === "error").length}</b>\n` +
      `Ўртача балл: <b>${avg}</b>\n\n` +
      [...byVacancy].map(([t, n]) => `• ${esc(t)}: ${n}`).join("\n"),
    { parse_mode: "HTML" },
  );
});

function shortList(records: CandidateRecord[]) {
  if (!records.length) return "Ҳозирча номзодлар йўқ.";
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
  await ctx.reply(`🏆 <b>Энг яхши номзодлар</b>\n\n${shortList(top)}`, { parse_mode: "HTML" });
});

bot.command("recent", async (ctx) => {
  if (!isAdmin(ctx)) return;
  await ctx.reply(`🕒 <b>Охирги аризалар</b>\n\n${shortList(listCandidates().slice(-10).reverse())}`, { parse_mode: "HTML" });
});

bot.command("blank", async (ctx) => {
  if (!isAdmin(ctx)) return;
  const file = loadVacancies();
  for (const v of file.vacancies) {
    await ctx.replyWithDocument(new InputFile(await buildAnketa(file, v), `Anketa_${v.id}.docx`), { caption: v.title });
  }
});

bot.hears(/^\/view_([a-f0-9]+)/, async (ctx) => {
  if (!isAdmin(ctx)) return;
  const r = getCandidate(ctx.match[1]);
  if (!r) return ctx.reply("Топилмади.");
  await sendFull(ctx.chat.id, r);
});

bot.hears(/^\/retry_([a-f0-9]+)/, async (ctx) => {
  if (!isAdmin(ctx)) return;
  const r = getCandidate(ctx.match[1]);
  if (!r) return ctx.reply("Топилмади.");
  await ctx.reply("🔄 Қайта таҳлил бошланди...");
  r.status = "pending";
  saveCandidate(r);
  void processCandidate(r);
});

// ───────────────────────── Ишга тушириш ─────────────────────────

// Бот қайта ишга тушганда чала қолган таҳлилларни давом эттириш
for (const r of listCandidates()) if (r.status === "pending") void processCandidate(r).catch(() => {});

bot.catch((err) => console.error("Бот хатоси:", err.error));

bot.api
  .setMyCommands([
    { command: "start", description: "Ишга ариза топшириш" },
    { command: "cancel", description: "Бекор қилиш" },
  ])
  .catch(() => {});

bot.start({ onStart: (me) => console.log(`🤖 @${me.username} ишга тушди. Админлар: ${config.adminChatIds.join(", ")}`) });
