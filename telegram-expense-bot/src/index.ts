import "dotenv/config";
import { Context, Markup, session, Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import { parseExpenseWithAI, parseStandaloneDate } from "./ai";
import { MatchResult, parseSalesLines } from "./products";
import {
  appendDebtEntry,
  appendFactoryPayment,
  appendOrAccumulateExpense,
  DateNotPreparedError,
  getFinalReportSummary,
  getProductCatalog,
  getSheetUrl,
  SheetCapacityError,
  setBankReceipt,
  setTruckSalesBatch,
  TRUCK_SHEETS,
} from "./sheets";
import { ActiveForm, DraftExpense, FieldDef, FormFlow } from "./types";

interface TruckSalesDraft {
  truck?: string;
  date?: Date;
  step: "date" | "products";
  matches?: MatchResult[];
}

interface SessionData {
  draft?: DraftExpense;
  form?: ActiveForm;
  truckSales?: TruckSalesDraft;
}

interface BotContext extends Context {
  session: SessionData;
}

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  throw new Error("BOT_TOKEN is not set");
}

const bot = new Telegraf<BotContext>(BOT_TOKEN);
bot.use(session({ defaultSession: (): SessionData => ({}) }));

const QUICK_CATEGORIES = ["Yoqilg'i", "Ta'mirlash", "Ijara", "Maosh", "Ofis xarajatlari", "Boshqa"];
const FACTORY_SUPPLIERS = ["MARWIN", "RICOMEL", "IMIR-TRADE"];

const MENU = Markup.keyboard([
  ["➕ Xarajat", "🚚 Kunlik savdo"],
  ["🧾 Qarz (hisob-faktura)", "🏭 Zavodga to'lov"],
  ["🏦 Bank tushumi"],
  ["📊 Hisobot", "📊 Fayl"],
]).resize();

const fmt = (n: number) => Math.round(n).toLocaleString("ru-RU").replace(/,/g, " ");
const dateLabel = (d: Date) => d.toLocaleDateString("uz-UZ", { day: "numeric", month: "long", timeZone: "UTC" });

async function sheetLinkKeyboard() {
  const url = await getSheetUrl();
  return Markup.inlineKeyboard([[Markup.button.url("📊 Google Sheets'ni ochish", url)]]);
}

bot.start(async (ctx) => {
  ctx.session = {};
  await ctx.reply(
    [
      "🤖 *Xarajatlar AI* ga xush kelibsiz!",
      "",
      "Bu bot orqali balans faylingizga (Google Sheets) to'g'ridan-to'g'ri yozishingiz mumkin — fayldagi formulalar hech qachon buzilmaydi.",
      "",
      "💸 *Xarajat* — oddiy matn bilan yozing: \"50000 yoqilg'iga\"",
      "🚚 *Kunlik savdo* — mashina bo'yicha sotilgan/qaytgan mahsulotlar",
      "🧾 *Qarz* — yangi mijoz hisob-fakturasi",
      "🏭 *Zavodga to'lov* — yetkazib beruvchiga to'lov",
      "🏦 *Bank tushumi* — kunlik terminal tushumini bankka tasdiqlash",
      "",
      "Quyidagi menyudan tanlang 👇",
    ].join("\n"),
    { parse_mode: "Markdown", ...MENU }
  );
});

bot.command("bekor", async (ctx) => {
  ctx.session.draft = undefined;
  ctx.session.form = undefined;
  ctx.session.truckSales = undefined;
  await ctx.reply("❌ Bekor qilindi.", MENU);
});

bot.command("fayl", async (ctx) => {
  try {
    await ctx.reply("📊 Balans faylingiz (Google Sheets):", await sheetLinkKeyboard());
  } catch (err) {
    console.error(err);
    await ctx.reply("⚠️ Fayl havolasini olishda xatolik yuz berdi.");
  }
});

bot.command("hisobot", (ctx) => sendReport(ctx));
bot.hears("📊 Hisobot", (ctx) => sendReport(ctx));
bot.hears("📊 Fayl", async (ctx) => {
  try {
    await ctx.reply("📊 Balans faylingiz (Google Sheets):", await sheetLinkKeyboard());
  } catch (err) {
    console.error(err);
    await ctx.reply("⚠️ Fayl havolasini olishda xatolik yuz berdi.");
  }
});

async function sendReport(ctx: BotContext) {
  await ctx.reply("⏳ Hisobot o'qilmoqda...");
  try {
    const summary = await getFinalReportSummary();
    const lines = [`📊 *${summary.title}*`, ""];
    lines.push(
      summary.totalRevenue !== null ? `💰 Jami tushum: ${fmt(summary.totalRevenue)} so'm` : "💰 Jami tushum: topilmadi"
    );
    lines.push(
      summary.totalExpense !== null
        ? `💸 Jami xarajat: ${fmt(summary.totalExpense)} so'm`
        : "💸 Jami xarajat: topilmadi"
    );
    lines.push(
      summary.netSales !== null ? `📦 Sof sotish: ${fmt(summary.netSales)} so'm` : "📦 Sof sotish: topilmadi"
    );
    await ctx.replyWithMarkdown(lines.join("\n"), await sheetLinkKeyboard());
  } catch (err) {
    console.error(err);
    await ctx.reply("⚠️ Hisobotni o'qib bo'lmadi. Fayl ulanishini tekshiring.");
  }
}

// ---------- Xarajat (free-text AI/rule-based flow) ----------

bot.hears("➕ Xarajat", async (ctx) => {
  ctx.session.form = undefined;
  ctx.session.truckSales = undefined;
  await ctx.reply("Xarajatni yozing, masalan: \"50000 yoqilg'iga\" yoki \"5-iyun 200000 ustaga\"");
});

async function showExpenseConfirmation(ctx: BotContext) {
  const draft = ctx.session.draft;
  if (!draft) return;

  await ctx.reply(
    `💸 ${fmt(draft.amount)} so'm — ${draft.category} — ${dateLabel(draft.date)}\n\nTasdiqlaysizmi?`,
    Markup.inlineKeyboard([
      [Markup.button.callback("✅ Saqlash", "confirm_save")],
      [Markup.button.callback("✏️ Turini o'zgartirish", "confirm_edit")],
      [Markup.button.callback("❌ Bekor qilish", "confirm_cancel")],
    ])
  );
}

bot.action("confirm_save", async (ctx) => {
  const draft = ctx.session.draft;
  await ctx.answerCbQuery();
  if (!draft) return;

  try {
    const result = await appendOrAccumulateExpense(draft.date, draft.amount, draft.category);
    ctx.session.draft = undefined;
    await ctx.editMessageText(
      `✅ Saqlandi! Kunlik jami: ${fmt(result.totalForDay)} so'm (${result.categoriesForDay})`,
      await sheetLinkKeyboard()
    );
  } catch (err) {
    if (err instanceof DateNotPreparedError) {
      await ctx.editMessageText(`⚠️ ${err.message}\nAvval faylda ushbu sana uchun qator tayyorlang.`);
    } else {
      console.error(err);
      await ctx.editMessageText("⚠️ Faylga yozishda xatolik yuz berdi. Keyinroq qayta urinib ko'ring.");
    }
  }
});

bot.action("confirm_cancel", async (ctx) => {
  ctx.session.draft = undefined;
  await ctx.answerCbQuery();
  await ctx.editMessageText("❌ Bekor qilindi.");
});

bot.action("confirm_edit", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageReplyMarkup(undefined);
  await ctx.reply(
    "📂 To'g'ri turini tanlang:",
    Markup.inlineKeyboard(
      QUICK_CATEGORIES.map((c) => Markup.button.callback(c, `pickcat:${c}`)),
      { columns: 2 }
    )
  );
});

bot.action(/^pickcat:(.+)$/, async (ctx) => {
  const draft = ctx.session.draft;
  await ctx.answerCbQuery();
  if (!draft) return;
  draft.category = ctx.match[1];
  await ctx.deleteMessage().catch(() => undefined);
  await showExpenseConfirmation(ctx);
});

// ---------- Generic guided form engine (qarz / zavodga to'lov / bank tushumi) ----------

const DEBT_FIELDS: FieldDef[] = [
  { key: "company", prompt: "🏢 Firma/mijoz nomi?", type: "text" },
  { key: "amount", prompt: "💰 Hisob-faktura summasi (so'm)?", type: "number" },
  { key: "paid", prompt: "💵 Hozir to'langan summa? (yo'q bo'lsa \"-\" yozing)", type: "number", optional: true },
  { key: "phone", prompt: "📞 Telefon raqami? (ixtiyoriy, \"-\")", type: "text", optional: true },
  { key: "district", prompt: "📍 Tuman/hudud? (ixtiyoriy, \"-\")", type: "text", optional: true },
  { key: "rep", prompt: "🧑‍💼 Sotuvchi/vakil ismi? (ixtiyoriy, \"-\")", type: "text", optional: true },
  { key: "invoiceNo", prompt: "🧾 Nakladnaya raqami? (ixtiyoriy, \"-\")", type: "text", optional: true },
  { key: "date", prompt: "📅 Sana? (masalan 5-iyun, yoki \"-\" = bugun)", type: "date", optional: true },
];

const FACTORY_FIELDS: FieldDef[] = [
  { key: "supplier", prompt: "🏭 Qaysi yetkazib beruvchi?", type: "choice", choices: FACTORY_SUPPLIERS },
  { key: "amount", prompt: "💰 To'lov summasi (so'm)?", type: "number" },
  { key: "note", prompt: "📝 Izoh? (ixtiyoriy, \"-\")", type: "text", optional: true },
  { key: "date", prompt: "📅 Sana? (\"-\" = bugun)", type: "date", optional: true },
];

const BANK_FIELDS: FieldDef[] = [
  { key: "amount", prompt: "🏦 Bankka tushgan summa (so'm)?", type: "number" },
  { key: "date", prompt: "📅 Qaysi kun uchun? (\"-\" = bugun)", type: "date", optional: true },
];

bot.hears("🧾 Qarz (hisob-faktura)", (ctx) => startForm(ctx, "debt", DEBT_FIELDS));
bot.hears("🏭 Zavodga to'lov", (ctx) => startForm(ctx, "factory", FACTORY_FIELDS));
bot.hears("🏦 Bank tushumi", (ctx) => startForm(ctx, "bank", BANK_FIELDS));

async function startForm(ctx: BotContext, flow: FormFlow, fields: FieldDef[]) {
  ctx.session.draft = undefined;
  ctx.session.truckSales = undefined;
  ctx.session.form = { flow, fields, index: 0, values: {} };
  await ctx.reply("Istalgan payt bekor qilish uchun /bekor yozing.", Markup.removeKeyboard());
  await askCurrentField(ctx);
}

async function askCurrentField(ctx: BotContext) {
  const form = ctx.session.form;
  if (!form) return;
  const field = form.fields[form.index];

  if (field.type === "choice") {
    await ctx.reply(field.prompt, Markup.inlineKeyboard(field.choices!.map((c) => Markup.button.callback(c, `formchoice:${c}`)), { columns: 2 }));
  } else {
    await ctx.reply(field.prompt);
  }
}

function parseFieldValue(field: FieldDef, text: string): string | number | Date | null {
  if (field.type === "number") {
    const n = Number(text.replace(/\s/g, "").replace(/[^\d.]/g, ""));
    return n > 0 ? n : null;
  }
  if (field.type === "date") {
    return parseStandaloneDate(text);
  }
  return text.trim() || null;
}

async function handleFormTextInput(ctx: BotContext, text: string) {
  const form = ctx.session.form;
  if (!form) return;
  const field = form.fields[form.index];
  if (field.type === "choice") return; // handled only via inline buttons

  if (text.trim() === "-" && field.optional) {
    // skip, leave unset
  } else {
    const value = parseFieldValue(field, text);
    if (value === null) {
      await ctx.reply("Tushunmadim, qaytadan urinib ko'ring (yoki /bekor).");
      return;
    }
    form.values[field.key] = value;
  }

  await advanceForm(ctx);
}

async function advanceForm(ctx: BotContext) {
  const form = ctx.session.form;
  if (!form) return;
  form.index++;
  if (form.index >= form.fields.length) {
    await showFormConfirmation(ctx);
  } else {
    await askCurrentField(ctx);
  }
}

function formSummary(form: ActiveForm): string {
  const v = form.values;
  const dateStr = v.date instanceof Date ? dateLabel(v.date) : "bugun";

  if (form.flow === "debt") {
    const lines = [`🧾 Yangi qarz:`, `🏢 ${v.company}`, `💰 ${fmt(Number(v.amount))} so'm`];
    if (v.paid) lines.push(`💵 To'langan: ${fmt(Number(v.paid))} so'm`);
    if (v.phone) lines.push(`📞 ${v.phone}`);
    if (v.district) lines.push(`📍 ${v.district}`);
    if (v.rep) lines.push(`🧑‍💼 ${v.rep}`);
    if (v.invoiceNo) lines.push(`🧾 № ${v.invoiceNo}`);
    lines.push(`📅 ${dateStr}`);
    return lines.join("\n");
  }

  if (form.flow === "factory") {
    const lines = [`🏭 Zavodga to'lov:`, `${v.supplier} — ${fmt(Number(v.amount))} so'm`, `📅 ${dateStr}`];
    if (v.note) lines.push(`📝 ${v.note}`);
    return lines.join("\n");
  }

  return `🏦 Bank tushumi:\n📅 ${dateStr} — ${fmt(Number(v.amount))} so'm`;
}

async function showFormConfirmation(ctx: BotContext) {
  const form = ctx.session.form;
  if (!form) return;

  await ctx.reply(
    `${formSummary(form)}\n\nTasdiqlaysizmi?`,
    Markup.inlineKeyboard([
      [Markup.button.callback("✅ Saqlash", "form_save")],
      [Markup.button.callback("❌ Bekor qilish", "form_cancel")],
    ])
  );
}

bot.action(/^formchoice:(.+)$/, async (ctx) => {
  const form = ctx.session.form;
  await ctx.answerCbQuery();
  if (!form) return;
  const field = form.fields[form.index];
  form.values[field.key] = ctx.match[1];
  await ctx.editMessageReplyMarkup(undefined).catch(() => undefined);
  await advanceForm(ctx);
});

bot.action("form_cancel", async (ctx) => {
  ctx.session.form = undefined;
  await ctx.answerCbQuery();
  await ctx.editMessageText("❌ Bekor qilindi.");
  await ctx.reply("Menyu:", MENU);
});

bot.action("form_save", async (ctx) => {
  const form = ctx.session.form;
  await ctx.answerCbQuery();
  if (!form) return;

  try {
    const v = form.values;
    if (form.flow === "debt") {
      await appendDebtEntry({
        company: String(v.company),
        amount: Number(v.amount),
        paid: v.paid ? Number(v.paid) : undefined,
        phone: v.phone ? String(v.phone) : undefined,
        district: v.district ? String(v.district) : undefined,
        rep: v.rep ? String(v.rep) : undefined,
        invoiceNo: v.invoiceNo ? String(v.invoiceNo) : undefined,
        date: v.date instanceof Date ? v.date : undefined,
      });
      await ctx.editMessageText("✅ Qarz/hisob-faktura saqlandi!", await sheetLinkKeyboard());
    } else if (form.flow === "factory") {
      await appendFactoryPayment({
        supplier: String(v.supplier),
        amount: Number(v.amount),
        note: v.note ? String(v.note) : undefined,
        date: v.date instanceof Date ? v.date : undefined,
      });
      await ctx.editMessageText("✅ Zavodga to'lov saqlandi!", await sheetLinkKeyboard());
    } else {
      const result = await setBankReceipt(v.date instanceof Date ? v.date : new Date(), Number(v.amount));
      const prevNote = result.previousAmount ? ` (avvalgi qiymat ${fmt(result.previousAmount)} so'm almashtirildi)` : "";
      await ctx.editMessageText(`✅ Bank tushumi saqlandi!${prevNote}`, await sheetLinkKeyboard());
    }
    ctx.session.form = undefined;
    await ctx.reply("Menyu:", MENU);
  } catch (err) {
    if (err instanceof DateNotPreparedError) {
      await ctx.editMessageText(`⚠️ ${err.message}\nAvval faylda ushbu sana uchun qator tayyorlang.`);
    } else if (err instanceof SheetCapacityError) {
      await ctx.editMessageText(`⚠️ ${err.message}`);
    } else {
      console.error(err);
      await ctx.editMessageText("⚠️ Faylga yozishda xatolik yuz berdi. Keyinroq qayta urinib ko'ring.");
    }
    ctx.session.form = undefined;
    await ctx.reply("Menyu:", MENU);
  }
});

// ---------- Kunlik savdo (per-truck daily product sales, free-text list) ----------

bot.hears("🚚 Kunlik savdo", async (ctx) => {
  ctx.session.draft = undefined;
  ctx.session.form = undefined;
  ctx.session.truckSales = undefined;
  await ctx.reply(
    "🚚 Qaysi mashina?",
    Markup.inlineKeyboard(
      TRUCK_SHEETS.map((t) => Markup.button.callback(t, `truck:${t}`)),
      { columns: 2 }
    )
  );
});

bot.action(/^truck:(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  ctx.session.truckSales = { truck: ctx.match[1], step: "date" };
  await ctx.editMessageReplyMarkup(undefined).catch(() => undefined);
  await ctx.reply("📅 Qaysi kun uchun? (\"-\" = bugun)", Markup.removeKeyboard());
});

async function handleTruckSalesInput(ctx: BotContext, text: string) {
  const draft = ctx.session.truckSales;
  if (!draft) return;

  if (draft.step === "date") {
    const date = parseStandaloneDate(text);
    if (!date) {
      await ctx.reply("Sanani tushunmadim, qaytadan urinib ko'ring (masalan 5-iyun yoki \"-\").");
      return;
    }
    draft.date = date;
    draft.step = "products";
    await ctx.reply(
      [
        "📦 Endi sotilgan/qaytgan mahsulotlarni yozing, har birini yangi qatorda:",
        "MahsulotNomi SotilganSoni QaytganSoni",
        "",
        "Masalan:",
        "Манго 5 1",
        "Абрикос 3",
      ].join("\n")
    );
    return;
  }

  if (draft.step === "products") {
    const catalog = await getProductCatalog();
    const matches = parseSalesLines(text, catalog);
    draft.matches = matches;

    const lines = ["📋 Natija:"];
    for (const m of matches) {
      if (m.product) {
        lines.push(`✅ ${m.product.name}: ${m.sold} sotildi, ${m.returned} qaytdi`);
      } else {
        lines.push(`⚠️ "${m.line}" — mahsulot topilmadi yoki bir nechta mos keldi, o'tkazib yuboriladi`);
      }
    }

    const matchedCount = matches.filter((m) => m.product).length;
    if (matchedCount === 0) {
      lines.push("", "Hech qanday mahsulot tanilmadi. Qaytadan urinib ko'ring yoki /bekor yozing.");
      await ctx.reply(lines.join("\n"));
      return;
    }

    lines.push("", "Tasdiqlaysizmi?");
    await ctx.reply(
      lines.join("\n"),
      Markup.inlineKeyboard([
        [Markup.button.callback("✅ Saqlash", "truck_save")],
        [Markup.button.callback("❌ Bekor qilish", "truck_cancel")],
      ])
    );
  }
}

bot.action("truck_cancel", async (ctx) => {
  ctx.session.truckSales = undefined;
  await ctx.answerCbQuery();
  await ctx.editMessageText("❌ Bekor qilindi.");
  await ctx.reply("Menyu:", MENU);
});

bot.action("truck_save", async (ctx) => {
  const draft = ctx.session.truckSales;
  await ctx.answerCbQuery();
  if (!draft || !draft.truck || !draft.matches) return;

  try {
    const entries = draft.matches
      .filter((m) => m.product)
      .map((m) => ({ productIndex: m.product!.index, productName: m.product!.name, sold: m.sold, returned: m.returned }));

    const results = await setTruckSalesBatch(draft.truck, draft.date ?? new Date(), entries);
    ctx.session.truckSales = undefined;
    await ctx.editMessageText(`✅ ${results.length} ta mahsulot uchun ${draft.truck} yozildi!`, await sheetLinkKeyboard());
    await ctx.reply("Menyu:", MENU);
  } catch (err) {
    if (err instanceof DateNotPreparedError) {
      await ctx.editMessageText(`⚠️ ${err.message}\nAvval faylda ushbu sana uchun kunlik blok tayyorlang.`);
    } else {
      console.error(err);
      await ctx.editMessageText("⚠️ Faylga yozishda xatolik yuz berdi. Keyinroq qayta urinib ko'ring.");
    }
    ctx.session.truckSales = undefined;
    await ctx.reply("Menyu:", MENU);
  }
});

// ---------- Catch-all text handler ----------

bot.on(message("text"), async (ctx) => {
  if (ctx.message.text.startsWith("/")) return;
  const text = ctx.message.text.trim();

  if (ctx.session.form) {
    await handleFormTextInput(ctx, text);
    return;
  }

  if (ctx.session.truckSales) {
    await handleTruckSalesInput(ctx, text);
    return;
  }

  const parsed = await parseExpenseWithAI(text);
  if (!parsed) {
    await ctx.reply("Summani aniqlay olmadim. Iltimos, summani ham yozing, masalan: \"50000 yoqilg'iga\"");
    return;
  }

  ctx.session.draft = { amount: parsed.amount, category: parsed.category, date: parsed.date, rawText: text };
  await showExpenseConfirmation(ctx);
});

bot.launch().then(() => console.log("Xarajatlar AI boti ishga tushdi."));

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
