import { Telegraf } from "telegraf";
import { BotContext } from "../types";
import prisma from "../lib/prisma";
import { mainMenuKeyboard } from "../utils/keyboards";

export function registerStartHandlers(bot: Telegraf<BotContext>) {
  bot.start(async (ctx) => {
    const chatId = ctx.chat.id;
    const customer = await prisma.customer.findUnique({ where: { telegramChatId: String(chatId) } });
    if (customer) {
      ctx.session.customer = {
        id: customer.id,
        telegramChatId: customer.telegramChatId,
        companyName: customer.companyName,
        ownerName: customer.ownerName,
        phone: customer.phone,
        address: customer.address,
      };
      await ctx.reply(
        `Xush kelibsiz, ${customer.companyName}! 👋\n\nQuyidagi menyudan foydalaning.`,
        mainMenuKeyboard
      );
      return;
    }
    await ctx.scene.enter("register");
  });
}
