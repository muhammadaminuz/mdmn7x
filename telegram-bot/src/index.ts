import "dotenv/config";
import { Telegraf, Scenes, session } from "telegraf";
import { BotContext } from "./types";
import { orderScene } from "./scenes/orderScene";
import { registerStartHandlers } from "./handlers/start";
import { registerMenuHandlers } from "./handlers/menu";

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error("❌ BOT_TOKEN aniqlanmagan. .env faylini tekshiring.");
  process.exit(1);
}

const bot = new Telegraf<BotContext>(BOT_TOKEN);
const stage = new Scenes.Stage<BotContext>([orderScene]);

bot.use(session());
bot.use(stage.middleware());

registerStartHandlers(bot);
registerMenuHandlers(bot);

bot.command("bekor", async (ctx) => {
  await ctx.reply("Hozir faol buyurtma jarayoni yo'q.");
});

bot.on("text", async (ctx) => {
  await ctx.reply("Iltimos, quyidagi menyudan foydalaning yoki /start buyrug'ini yuboring.");
});

bot.catch((err, ctx) => {
  console.error(`⚠️  Bot xatoligi (${ctx.updateType}):`, err);
});

process.on("unhandledRejection", (reason) => {
  console.error("⚠️  Unhandled promise rejection:", reason);
});

bot
  .launch()
  .then(() => console.log("🤖 FMCG Telegram B2B order bot ishga tushdi"))
  .catch((err) => {
    console.error("❌ Botni ishga tushirib bo'lmadi:", err);
    process.exit(1);
  });

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
