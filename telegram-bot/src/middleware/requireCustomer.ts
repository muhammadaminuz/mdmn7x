import { BotContext } from "../types";
import { getCustomer } from "../lib/api";
import { contactRequestKeyboard } from "../utils/keyboards";

// Ensures ctx.session.customer is populated, prompting for a phone share if the
// chat isn't linked yet. Session cache is refreshed lazily from the DB so a bot
// restart (which clears the in-memory session store) doesn't require re-linking.
export async function ensureLinkedCustomer(ctx: BotContext): Promise<boolean> {
  if (ctx.session.customer) return true;
  const chatId = ctx.chat?.id;
  if (!chatId) return false;

  const customer = await getCustomer(chatId);
  if (customer) {
    ctx.session.customer = customer;
    return true;
  }

  await ctx.reply(
    "Sizning Telegram hisobingiz hali mijoz bazasiga bog'lanmagan.\n\nDavom etish uchun telefon raqamingizni yuboring:",
    contactRequestKeyboard
  );
  return false;
}
