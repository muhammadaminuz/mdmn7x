import { Telegraf, Markup } from "telegraf";
import { message } from "telegraf/filters";
import { BotContext } from "../types";
import { isAdmin } from "../lib/admin";
import prisma from "../lib/prisma";
import { formatSum, statusLabel } from "../utils/format";

// chatId -> productId currently awaiting a new price via plain text reply.
const awaitingPriceEdit = new Map<number, number>();

function adminOnly(ctx: BotContext): boolean {
  return isAdmin(ctx.from?.id);
}

export function registerAdminHandlers(bot: Telegraf<BotContext>) {
  bot.command("id", async (ctx) => {
    await ctx.reply(`Sizning Telegram ID'ingiz: ${ctx.from.id}\n\nAdministrator bo'lish uchun buni .env faylidagi ADMIN_IDS ga qo'shing va botni qayta ishga tushiring.`);
  });

  bot.command("admin", async (ctx) => {
    if (!adminOnly(ctx)) {
      await ctx.reply("Bu buyruq faqat administratorlar uchun.");
      return;
    }
    await ctx.reply(
      "🛠 Admin buyruqlari:\n\n" +
        "/mahsulot_qoshish — yangi mahsulot qo'shish\n" +
        "/mahsulotlar — mahsulotlar ro'yxati (narx o'zgartirish/o'chirish)\n" +
        "/buyurtmalar — oxirgi buyurtmalar"
    );
  });

  bot.command("mahsulot_qoshish", async (ctx) => {
    if (!adminOnly(ctx)) {
      await ctx.reply("Bu buyruq faqat administratorlar uchun.");
      return;
    }
    await ctx.scene.enter("addProduct");
  });

  bot.command("mahsulotlar", async (ctx) => {
    if (!adminOnly(ctx)) {
      await ctx.reply("Bu buyruq faqat administratorlar uchun.");
      return;
    }
    const products = await prisma.product.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
    if (products.length === 0) {
      await ctx.reply("Hozircha mahsulot yo'q. /mahsulot_qoshish bilan qo'shing.");
      return;
    }
    for (const p of products) {
      await ctx.reply(
        `📦 ${p.name}\n🏷 ${p.category}\n💵 ${formatSum(p.price)}\n📊 ${p.stock} dona`,
        Markup.inlineKeyboard([
          [
            Markup.button.callback("✏️ Narxni o'zgartirish", `editprice_${p.id}`),
            Markup.button.callback("🗑 O'chirish", `delete_${p.id}`),
          ],
        ])
      );
    }
  });

  bot.command("buyurtmalar", async (ctx) => {
    if (!adminOnly(ctx)) {
      await ctx.reply("Bu buyruq faqat administratorlar uchun.");
      return;
    }
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { customer: true, items: true },
    });
    if (orders.length === 0) {
      await ctx.reply("Hozircha buyurtmalar yo'q.");
      return;
    }
    const text = orders
      .map(
        (o) =>
          `📄 ${o.orderNo} — ${statusLabel(o.status)}\n🏢 ${o.customer.companyName} (${o.customer.phone})\n💵 ${formatSum(o.total)}`
      )
      .join("\n\n");
    await ctx.reply(`📋 Oxirgi buyurtmalar:\n\n${text}`);
  });

  bot.action(/^editprice_(\d+)$/, async (ctx) => {
    if (!adminOnly(ctx)) {
      await ctx.answerCbQuery("Ruxsat yo'q");
      return;
    }
    const productId = Number(ctx.match[1]);
    awaitingPriceEdit.set(ctx.chat!.id, productId);
    await ctx.answerCbQuery();
    await ctx.reply("Yangi narxni kiriting (faqat raqam, masalan: 18000):");
  });

  bot.action(/^delete_(\d+)$/, async (ctx) => {
    if (!adminOnly(ctx)) {
      await ctx.answerCbQuery("Ruxsat yo'q");
      return;
    }
    const productId = Number(ctx.match[1]);
    await prisma.product.update({ where: { id: productId }, data: { isActive: false } });
    await ctx.answerCbQuery("O'chirildi");
    await ctx.editMessageText("🗑 Mahsulot o'chirildi.");
  });

  bot.action(/^approve_(\d+)$/, async (ctx) => {
    if (!adminOnly(ctx)) {
      await ctx.answerCbQuery("Ruxsat yo'q");
      return;
    }
    const orderId = Number(ctx.match[1]);
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { customer: true } });
    if (!order || order.status !== "PENDING") {
      await ctx.answerCbQuery("Bu buyurtma allaqachon ko'rib chiqilgan");
      return;
    }
    await prisma.order.update({ where: { id: orderId }, data: { status: "APPROVED" } });
    await ctx.answerCbQuery("Tasdiqlandi");
    await ctx.editMessageText(`${(ctx.callbackQuery.message as any)?.text ?? ""}\n\n✅ Tasdiqlandi`);
    await ctx.telegram.sendMessage(
      order.customer.telegramChatId,
      `✅ Buyurtmangiz tasdiqlandi!\n\n📄 ${order.orderNo}\n💵 ${formatSum(order.total)}`
    );
  });

  bot.action(/^reject_(\d+)$/, async (ctx) => {
    if (!adminOnly(ctx)) {
      await ctx.answerCbQuery("Ruxsat yo'q");
      return;
    }
    const orderId = Number(ctx.match[1]);
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { customer: true, items: true } });
    if (!order || order.status !== "PENDING") {
      await ctx.answerCbQuery("Bu buyurtma allaqachon ko'rib chiqilgan");
      return;
    }
    await prisma.$transaction([
      prisma.order.update({ where: { id: orderId }, data: { status: "CANCELLED" } }),
      ...order.items.map((i) =>
        prisma.product.update({ where: { id: i.productId }, data: { stock: { increment: i.quantity } } })
      ),
    ]);
    await ctx.answerCbQuery("Bekor qilindi");
    await ctx.editMessageText(`${(ctx.callbackQuery.message as any)?.text ?? ""}\n\n❌ Bekor qilindi`);
    await ctx.telegram.sendMessage(
      order.customer.telegramChatId,
      `❌ Buyurtmangiz bekor qilindi.\n\n📄 ${order.orderNo}\n\nBatafsil ma'lumot uchun administrator bilan bog'laning.`
    );
  });

  bot.on(message("text"), async (ctx, next) => {
    const chatId = ctx.chat.id;
    const productId = awaitingPriceEdit.get(chatId);
    if (productId === undefined || !adminOnly(ctx)) return next();

    const price = Number(ctx.message.text.replace(/[^\d.]/g, ""));
    if (!price || price <= 0) {
      await ctx.reply("Iltimos, to'g'ri narx kiriting (masalan: 18000):");
      return;
    }
    const product = await prisma.product.update({ where: { id: productId }, data: { price } });
    awaitingPriceEdit.delete(chatId);
    await ctx.reply(`✅ ${product.name} narxi ${formatSum(product.price)} ga o'zgartirildi.`);
  });
}
