import "dotenv/config";
import { Context, Markup, session, Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import { parseExpenseWithAI } from "./ai";
import { appendOrAccumulateExpense, DateNotPreparedError, getFinalReportSummary, getSheetUrl } from "./sheets";
import { DraftExpense } from "./types";

interface SessionData {
  draft?: DraftExpense;
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

const fmt = (n: number) => Math.round(n).toLocaleString("ru-RU").replace(/,/g, " ");

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
      "Xarajatingizni oddiy matn bilan yozing, masalan:",
      '_"50000 yoqilg\'iga"_ yoki _"ofisga 200000 ijaraga to\'ladik"_',
      "",
      "Men summani va turini o'zim aniqlayman, tasdiqlaganingizdan so'ng balans faylingizga (Google Sheets) yoziladi.",
      "",
      "📊 Joriy hisobotni ko'rish uchun /hisobot, faylning o'zini ochish uchun /fayl yuboring.",
    ].join("\n"),
    { parse_mode: "Markdown" }
  );
});

bot.command("fayl", async (ctx) => {
  try {
    await ctx.reply("📊 Balans faylingiz (Google Sheets):", await sheetLinkKeyboard());
  } catch (err) {
    console.error(err);
    await ctx.reply("⚠️ Fayl havolasini olishda xatolik yuz berdi.");
  }
});

bot.command("hisobot", async (ctx) => {
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
});

bot.on(message("text"), async (ctx) => {
  if (ctx.message.text.startsWith("/")) return;

  const text = ctx.message.text.trim();
  const parsed = await parseExpenseWithAI(text);

  if (!parsed) {
    await ctx.reply("Summani aniqlay olmadim. Iltimos, summani ham yozing, masalan: \"50000 yoqilg'iga\"");
    return;
  }

  ctx.session.draft = { amount: parsed.amount, category: parsed.category, date: parsed.date, rawText: text };
  await showConfirmation(ctx);
});

async function showConfirmation(ctx: BotContext) {
  const draft = ctx.session.draft;
  if (!draft) return;

  const dateLabel = draft.date.toLocaleDateString("uz-UZ", { day: "numeric", month: "long" });
  await ctx.reply(
    `💸 ${fmt(draft.amount)} so'm — ${draft.category} — ${dateLabel}\n\nTasdiqlaysizmi?`,
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
  await showConfirmation(ctx);
});

bot.launch().then(() => console.log("Xarajatlar AI boti ishga tushdi."));

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
