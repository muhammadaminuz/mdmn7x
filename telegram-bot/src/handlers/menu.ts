import { Telegraf } from "telegraf";
import { BotContext } from "../types";
import { ensureLinkedCustomer } from "../middleware/requireCustomer";
import { getOrderHistory, getCustomer } from "../lib/api";
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
    const orders = await getOrderHistory(ctx.chat.id);
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
    const customer = await getCustomer(ctx.chat.id);
    if (!customer) return;
    ctx.session.customer = customer;
    await ctx.reply(
      `🏢 ${customer.companyName}\n👤 ${customer.ownerName}\n📍 ${customer.region}, ${customer.district}\n\n` +
        `💰 Balans: ${formatSum(customer.balance)}\n📉 Qarzdorlik: ${formatSum(customer.debt)}\n\n` +
        `👨‍💼 Agent: ${customer.agentName} (${customer.agentPhone})`
    );
  });

  bot.hears(MENU_HELP, async (ctx) => {
    await ctx.reply(
      "ℹ️ Yordam\n\n" +
        `${MENU_ORDER} / ${MENU_CATALOG} — katalogdan mahsulot tanlab, savatga qo'shib buyurtma yuborasiz\n` +
        `${MENU_ORDERS} — oxirgi buyurtmalaringiz tarixi\n` +
        `${MENU_PROFILE} — balans va qarzdorlik ma'lumoti\n\n` +
        "Buyurtma jarayonini bekor qilish uchun /bekor buyrug'ini yuboring.",
      mainMenuKeyboard
    );
  });
}
