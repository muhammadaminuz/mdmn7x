import { Markup } from "telegraf";

export const MENU_ORDER = "🛒 Buyurtma berish";
export const MENU_CATALOG = "📦 Katalog";
export const MENU_ORDERS = "📋 Buyurtmalarim";
export const MENU_PROFILE = "🏢 Ma'lumotlarim";
export const MENU_HELP = "ℹ️ Yordam";

export const mainMenuKeyboard = Markup.keyboard([
  [MENU_ORDER, MENU_CATALOG],
  [MENU_ORDERS, MENU_PROFILE],
  [MENU_HELP],
]).resize();

export const contactRequestKeyboard = Markup.keyboard([
  [Markup.button.contactRequest("📱 Raqamni yuborish")],
]).resize().oneTime();

export const skipAddressKeyboard = Markup.inlineKeyboard([
  Markup.button.callback("O'tkazib yuborish ➡️", "skip_address"),
]);
