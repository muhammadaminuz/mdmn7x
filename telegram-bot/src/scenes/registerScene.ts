import { Scenes } from "telegraf";
import { message } from "telegraf/filters";
import { BotContext } from "../types";
import prisma from "../lib/prisma";
import { mainMenuKeyboard, contactRequestKeyboard, skipAddressKeyboard } from "../utils/keyboards";

export const registerScene = new Scenes.BaseScene<BotContext>("register");

async function finishRegistration(ctx: BotContext, address: string | null) {
  const chatId = ctx.chat!.id;
  const phone = ctx.scene.session.registerPhone!;
  const companyName = ctx.scene.session.registerCompanyName!;
  const ownerName = [ctx.from?.first_name, ctx.from?.last_name].filter(Boolean).join(" ") || companyName;

  const customer = await prisma.customer.create({
    data: {
      telegramChatId: String(chatId),
      telegramUsername: ctx.from?.username ?? null,
      companyName,
      ownerName,
      phone,
      address,
    },
  });

  ctx.session.customer = {
    id: customer.id,
    telegramChatId: customer.telegramChatId,
    companyName: customer.companyName,
    ownerName: customer.ownerName,
    phone: customer.phone,
    address: customer.address,
  };
  ctx.scene.session.registerPhone = undefined;
  ctx.scene.session.registerCompanyName = undefined;

  await ctx.reply(
    `✅ Xush kelibsiz, ${customer.companyName}!\n\nSiz muvaffaqiyatli ro'yxatdan o'tdingiz. Endi buyurtma berishingiz mumkin.`,
    mainMenuKeyboard
  );
  await ctx.scene.leave();
}

registerScene.enter(async (ctx) => {
  await ctx.reply(
    "Assalomu alaykum! 👋\n\nBu — B2B buyurtma boti. Ro'yxatdan o'tish uchun telefon raqamingizni yuboring:",
    contactRequestKeyboard
  );
});

registerScene.on(message("contact"), async (ctx) => {
  const contact = ctx.message.contact;
  if (contact.user_id && ctx.from && contact.user_id !== ctx.from.id) {
    await ctx.reply("Iltimos, faqat o'zingizning raqamingizni yuboring.");
    return;
  }
  ctx.scene.session.registerPhone = contact.phone_number;
  await ctx.reply("Rahmat! Endi korxona (yoki do'kon) nomini kiriting:");
});

registerScene.on(message("text"), async (ctx) => {
  if (!ctx.scene.session.registerPhone) {
    await ctx.reply("Iltimos, avval pastdagi tugma orqali telefon raqamingizni yuboring:", contactRequestKeyboard);
    return;
  }

  if (!ctx.scene.session.registerCompanyName) {
    const companyName = ctx.message.text.trim();
    if (companyName.length < 2) {
      await ctx.reply("Iltimos, korxona nomini to'liqroq kiriting:");
      return;
    }
    ctx.scene.session.registerCompanyName = companyName;
    await ctx.reply(
      "Manzilingizni kiriting (yetkazib berish uchun), yoki o'tkazib yuborishingiz mumkin:",
      skipAddressKeyboard
    );
    return;
  }

  const address = ctx.message.text.trim();
  await finishRegistration(ctx, address || null);
});

registerScene.action("skip_address", async (ctx) => {
  await ctx.answerCbQuery();
  await finishRegistration(ctx, null);
});
