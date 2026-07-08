import "dotenv/config";
import { Context, Markup, session, Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "./categories";
import { buildMonthlyWorkbook } from "./excel";
import { buildMonthlyReport, formatReportText } from "./report";
import { appendRow, ensureSheetReady, fetchAllRows } from "./sheets";
import { DraftEntry, LedgerRow } from "./types";

interface SessionData {
  draft?: DraftEntry;
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

const MENU = Markup.keyboard([
  ["➕ Xarajat", "➕ Daromad"],
  ["📊 Oylik hisobot"],
  ["❓ Yordam"],
]).resize();

function userLabel(ctx: BotContext): string {
  const from = ctx.from;
  if (!from) return "noma'lum";
  return from.username ? `@${from.username}` : [from.first_name, from.last_name].filter(Boolean).join(" ");
}

function categoryKeyboard(categories: string[]) {
  return Markup.inlineKeyboard(
    categories.map((c) => Markup.button.callback(c, `cat:${c}`)),
    { columns: 2 }
  );
}

bot.start(async (ctx) => {
  ctx.session = {};
  await ctx.reply(
    "👋 Xarajat va daromadlaringizni shu bot orqali yozib boring — ular avtomatik Google Sheets jadvaliga tushadi. Oy oxirida esa /hisobot orqali moliyaviy natijani ko'rasiz.",
    MENU
  );
});

bot.hears("❓ Yordam", async (ctx) => {
  await ctx.reply(
    [
      "➕ Xarajat / ➕ Daromad — yangi yozuv qo'shish",
      "📊 Oylik hisobot — joriy oy bo'yicha xulosa (matn + Excel fayl)",
      "",
      "Har bir yozuv: summa → kategoriya → izoh (ixtiyoriy) tartibida so'raladi.",
    ].join("\n"),
    MENU
  );
});

bot.hears("➕ Xarajat", async (ctx) => {
  ctx.session.draft = { type: "Xarajat", step: "amount" };
  await ctx.reply("💸 Xarajat summasini kiriting (masalan: 50000):", Markup.removeKeyboard());
});

bot.hears("➕ Daromad", async (ctx) => {
  ctx.session.draft = { type: "Daromad", step: "amount" };
  await ctx.reply("💰 Daromad summasini kiriting (masalan: 500000):", Markup.removeKeyboard());
});

bot.hears("📊 Oylik hisobot", async (ctx) => sendMonthlyReport(ctx));
bot.command("hisobot", async (ctx) => sendMonthlyReport(ctx));

async function sendMonthlyReport(ctx: BotContext) {
  await ctx.reply("⏳ Hisobot tayyorlanmoqda...");
  const rows = await fetchAllRows();
  const now = new Date();
  const report = buildMonthlyReport(rows, now.getFullYear(), now.getMonth());

  await ctx.replyWithMarkdown(formatReportText(report), MENU);

  const workbook = await buildMonthlyWorkbook(report);
  await ctx.replyWithDocument({
    source: workbook,
    filename: `hisobot-${report.monthLabel.replace(" ", "-")}.xlsx`,
  });
}

bot.action(/^cat:(.+)$/, async (ctx) => {
  const draft = ctx.session.draft;
  if (!draft || draft.step !== "category") {
    await ctx.answerCbQuery();
    return;
  }
  draft.category = ctx.match[1];
  draft.step = "note";
  await ctx.answerCbQuery();
  await ctx.editMessageReplyMarkup(undefined);
  await ctx.reply("📝 Izoh qo'shasizmi? Yozing yoki \"-\" yuboring (o'tkazib yuborish uchun).");
});

bot.on(message("text"), async (ctx) => {
  const draft = ctx.session.draft;
  if (!draft) return; // not in a data-entry flow, ignore (menu buttons handled above)

  if (draft.step === "amount") {
    const amount = Number(ctx.message.text.replace(/[^\d.]/g, ""));
    if (!amount || amount <= 0) {
      await ctx.reply("Iltimos, to'g'ri summa kiriting (faqat raqam), masalan: 50000");
      return;
    }
    draft.amount = amount;
    draft.step = "category";
    const categories = draft.type === "Xarajat" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
    await ctx.reply("📂 Kategoriyani tanlang:", categoryKeyboard(categories));
    return;
  }

  if (draft.step === "note") {
    const note = ctx.message.text.trim() === "-" ? "" : ctx.message.text.trim();
    const row: LedgerRow = {
      date: new Date().toISOString().slice(0, 10),
      type: draft.type,
      category: draft.category ?? "Boshqa",
      amount: draft.amount ?? 0,
      note,
      user: userLabel(ctx),
    };

    await appendRow(row);
    ctx.session.draft = undefined;

    const emoji = draft.type === "Xarajat" ? "💸" : "💰";
    await ctx.reply(
      `✅ Saqlandi: ${emoji} ${row.amount.toLocaleString("ru-RU")} so'm — ${row.category}`,
      MENU
    );
    return;
  }
});

async function main() {
  await ensureSheetReady();
  await bot.launch();
  console.log("Telegram expense bot ishga tushdi.");
}

main().catch((err) => {
  console.error("Botni ishga tushirishda xatolik:", err);
  process.exit(1);
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
