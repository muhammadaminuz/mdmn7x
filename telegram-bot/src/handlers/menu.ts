import { Telegraf } from "telegraf";
import { BotContext } from "../types";
import { ensureLinkedCustomer } from "../middleware/requireCustomer";
import prisma from "../lib/prisma";
import { formatSum, statusLabel } from "../utils/format";
import {
  MENU_ORDER,
  MENU_CATALOG,
  MENU_ORDERS,
  MENU_PROFILE,
  MENU_HELP,
  mainMenuKeyboard,
} from "../utils/keyboards";

export function registerMenuHandlers(bot: Telegraf<BotContext>) {
  bot.hears([MENU_ORDER, MENU_CATALOG], async (ctx) => {
    if (!(await ensureLinkedCustomer(ctx))) return;
    await ctx.scene.enter("order");
  });

  bot.hears(MENU_ORDERS, async (ctx) => {
    if (!(await ensureLinkedCustomer(ctx))) return;
    const customerId = ctx.session.customer!.id;
    const orders = await prisma.order.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { items: true },
    });
    if (orders.length === 0) {
      await ctx.reply("Sizda hali buyurtmalar yo'q.");
      return;
    }
    const text = orders
      .map(
        (o) =>
          `📄 ${o.orderNo} — ${statusLabel(o.status)}\n` +
          o.items.map((i) => `  • ${i.productName} x${i.quantity}`).join("\n") +
          `\nJami: ${formatSum(o.total)}`
      )
      .join("\n\n");
    await ctx.reply(`📋 Oxirgi buyurtmalaringiz:\n\n${text}`);
  });

  bot.hears(MENU_PROFILE, async (ctx) => {
    if (!(await ensureLinkedCustomer(ctx))) return;
    const customer = ctx.session.customer!;
    await ctx.reply(
      `🏢 ${customer.companyName}\n👤 ${customer.ownerName}\n📞 ${customer.phone}\n📍 ${customer.address ?? "kiritilmagan"}`
    );
  });

  bot.hears(MENU_HELP, async (ctx) => {
    await ctx.reply(
      "ℹ️ Yordam\n\n" +
        `${MENU_ORDER} / ${MENU_CATALOG} — katalogdan mahsulot tanlab, savatga qo'shib buyurtma yuborasiz\n` +
        `${MENU_ORDERS} — oxirgi buyurtmalaringiz tarixi\n` +
        `${MENU_PROFILE} — ro'yxatdan o'tgan ma'lumotlaringiz\n\n` +
        "Buyurtma jarayonini bekor qilish uchun /bekor buyrug'ini yuboring.",
      mainMenuKeyboard
    );
  });
}
