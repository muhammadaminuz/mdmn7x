import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import { BotContext } from "../types";
import { getCustomer, linkCustomer } from "../lib/api";
import { mainMenuKeyboard, contactRequestKeyboard } from "../utils/keyboards";

export function registerStartHandlers(bot: Telegraf<BotContext>) {
  bot.start(async (ctx) => {
    const chatId = ctx.chat.id;
    const customer = await getCustomer(chatId);
    if (customer) {
      ctx.session.customer = customer;
      await ctx.reply(
        `Xush kelibsiz, ${customer.companyName}! 👋\n\nSiz allaqachon ro'yxatdan o'tgansiz. Quyidagi menyudan foydalaning.`,
        mainMenuKeyboard
      );
      return;
    }
    await ctx.reply(
      "Assalomu alaykum! 👋\n\nBu — B2B buyurtma boti. Bu yerda siz to'g'ridan-to'g'ri Telegram orqali buyurtma bera olasiz, buyurtmalar tarixini va balansingizni ko'rishingiz mumkin.\n\nDavom etish uchun ro'yxatdan o'tgan telefon raqamingizni yuboring:",
      contactRequestKeyboard
    );
  });

  bot.on(message("contact"), async (ctx) => {
    const contact = ctx.message.contact;
    if (contact.user_id && ctx.from && contact.user_id !== ctx.from.id) {
      await ctx.reply("Iltimos, faqat o'zingizning raqamingizni yuboring.");
      return;
    }

    const chatId = ctx.chat.id;
    const customer = await linkCustomer(contact.phone_number, chatId, ctx.from?.username);
    if (!customer) {
      await ctx.reply(
        "❌ Bu raqam mijozlar bazasida topilmadi.\n\nTelegram orqali buyurtma berish uchun avval o'z agentingiz yoki menejeringiz orqali mijoz sifatida ro'yxatdan o'ting."
      );
      return;
    }

    ctx.session.customer = customer;
    await ctx.reply(
      `✅ Xush kelibsiz, ${customer.companyName}!\n\nSiz muvaffaqiyatli bog'landingiz. Endi buyurtma berishingiz mumkin.`,
      mainMenuKeyboard
    );
  });
}
