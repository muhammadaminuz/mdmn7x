import { BotContext } from "../types";
import prisma from "../lib/prisma";

// Ensures ctx.session.customer is populated, entering the self-registration
// scene otherwise. Session cache is refreshed lazily from the DB so a bot
// restart (which clears the in-memory session store) doesn't require re-registering.
export async function ensureLinkedCustomer(ctx: BotContext): Promise<boolean> {
  if (ctx.session.customer) return true;
  const chatId = ctx.chat?.id;
  if (!chatId) return false;

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
    return true;
  }

  await ctx.scene.enter("register");
  return false;
}
