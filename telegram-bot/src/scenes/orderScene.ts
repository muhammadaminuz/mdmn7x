import { Scenes, Markup } from "telegraf";
import { message } from "telegraf/filters";
import { BotContext } from "../types";
import prisma from "../lib/prisma";
import { generateOrderNo } from "../lib/orderNo";
import { ADMIN_IDS } from "../lib/admin";
import { formatSum } from "../utils/format";
import {
  mainMenuKeyboard,
  MENU_ORDER,
  MENU_CATALOG,
  MENU_ORDERS,
  MENU_PROFILE,
  MENU_HELP,
} from "../utils/keyboards";

export const orderScene = new Scenes.BaseScene<BotContext>("order");

const MENU_LABELS = [MENU_ORDER, MENU_CATALOG, MENU_ORDERS, MENU_PROFILE, MENU_HELP];

async function getCategories(): Promise<string[]> {
  const products = await prisma.product.findMany({
    where: { isActive: true, stock: { gt: 0 } },
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  });
  return products.map((p) => p.category);
}

async function getProducts(category?: string) {
  return prisma.product.findMany({
    where: { isActive: true, stock: { gt: 0 }, ...(category ? { category } : {}) },
    orderBy: { name: "asc" },
  });
}

async function showCategories(ctx: BotContext) {
  const categories = await getCategories();
  if (categories.length === 0) {
    await ctx.reply("Hozircha katalogda mahsulot yo'q.");
    await ctx.scene.leave();
    return;
  }
  const rows = categories.map((c) => [Markup.button.callback(c, `cat:${c}`)]);
  const cartCount = ctx.scene.session.cart?.length ?? 0;
  if (cartCount > 0) rows.push([Markup.button.callback(`🛒 Savat (${cartCount})`, "view_cart")]);
  await ctx.reply("Mahsulot toifasini tanlang:", Markup.inlineKeyboard(rows));
}

function cartTotal(ctx: BotContext): number {
  return (ctx.scene.session.cart ?? []).reduce((s, i) => s + i.price * i.quantity, 0);
}

function cartText(ctx: BotContext): string {
  const cart = ctx.scene.session.cart ?? [];
  if (cart.length === 0) return "Savat bo'sh.";
  const lines = cart.map(
    (i, idx) => `${idx + 1}. ${i.name} — ${i.quantity} x ${formatSum(i.price)} = ${formatSum(i.price * i.quantity)}`
  );
  return `🛒 Savatingiz:\n\n${lines.join("\n")}\n\nJami: ${formatSum(cartTotal(ctx))}`;
}

const cartActionsKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback("➕ Yana mahsulot qo'shish", "back_categories")],
  [Markup.button.callback("✅ Buyurtmani yakunlash", "checkout")],
  [Markup.button.callback("🗑 Savatni tozalash", "clear_cart")],
]);

orderScene.enter(async (ctx) => {
  if (!ctx.scene.session.cart) ctx.scene.session.cart = [];
  await ctx.reply("📦 Buyurtma berish\n\nJarayonni bekor qilish uchun /bekor buyrug'ini yuboring.");
  await showCategories(ctx);
});

orderScene.leave((ctx) => {
  ctx.scene.session.pendingProductId = undefined;
});

orderScene.command("bekor", async (ctx) => {
  ctx.scene.session.cart = [];
  ctx.scene.session.pendingProductId = undefined;
  await ctx.reply("Buyurtma bekor qilindi.", mainMenuKeyboard);
  await ctx.scene.leave();
});

orderScene.action(/^cat:(.+)$/, async (ctx) => {
  const category = ctx.match[1];
  const products = await getProducts(category);
  await ctx.answerCbQuery();
  if (products.length === 0) {
    await ctx.reply("Bu toifada mahsulot yo'q.");
    return;
  }
  ctx.scene.session.category = category;
  const rows = products.map((p) => [Markup.button.callback(`${p.name} — ${formatSum(p.price)}`, `prod:${p.id}`)]);
  rows.push([
    Markup.button.callback("⬅️ Toifalarga qaytish", "back_categories"),
    Markup.button.callback("🛒 Savat", "view_cart"),
  ]);
  await ctx.reply(`${category} bo'limi mahsulotlari:`, Markup.inlineKeyboard(rows));
});

orderScene.action("back_categories", async (ctx) => {
  await ctx.answerCbQuery();
  await showCategories(ctx);
});

orderScene.action(/^prod:(\d+)$/, async (ctx) => {
  ctx.scene.session.pendingProductId = Number(ctx.match[1]);
  await ctx.answerCbQuery();
  await ctx.reply("Nechta dona kerak? Sonini kiriting (masalan: 5):");
});

orderScene.action("view_cart", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(cartText(ctx), cartActionsKeyboard);
});

orderScene.action("clear_cart", async (ctx) => {
  ctx.scene.session.cart = [];
  await ctx.answerCbQuery("Savat tozalandi");
  await ctx.reply("Savat tozalandi.");
  await showCategories(ctx);
});

orderScene.action("checkout", async (ctx) => {
  const cart = ctx.scene.session.cart ?? [];
  if (cart.length === 0) {
    await ctx.answerCbQuery("Savat bo'sh");
    return;
  }
  await ctx.answerCbQuery();
  const customer = ctx.session.customer!;

  try {
    const orderNo = await generateOrderNo();
    const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);

    const order = await prisma.$transaction(async (tx) => {
      for (const item of cart) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product || product.stock < item.quantity) {
          throw new Error(`Omborda "${item.name}" uchun yetarli miqdor yo'q`);
        }
        await tx.product.update({ where: { id: item.productId }, data: { stock: { decrement: item.quantity } } });
      }
      return tx.order.create({
        data: {
          orderNo,
          customerId: customer.id,
          status: "PENDING",
          total,
          note: "Telegram bot orqali",
          items: {
            create: cart.map((i) => ({
              productId: i.productId,
              productName: i.name,
              price: i.price,
              quantity: i.quantity,
              total: i.price * i.quantity,
            })),
          },
        },
      });
    });

    ctx.scene.session.cart = [];
    await ctx.reply(
      `🎉 Buyurtmangiz qabul qilindi!\n\n📄 Raqami: ${order.orderNo}\n⏳ Holati: Kutilmoqda\nJami summa: ${formatSum(total)}\n\nBuyurtmangiz admin tomonidan tasdiqlanishi kutilmoqda.`,
      mainMenuKeyboard
    );

    const adminText =
      `🆕 Yangi buyurtma!\n\n📄 ${order.orderNo}\n🏢 ${customer.companyName}\n📞 ${customer.phone}\n\n` +
      cart.map((i) => `• ${i.name} x${i.quantity} = ${formatSum(i.price * i.quantity)}`).join("\n") +
      `\n\nJami: ${formatSum(total)}`;
    for (const adminId of ADMIN_IDS) {
      await ctx.telegram
        .sendMessage(
          adminId,
          adminText,
          Markup.inlineKeyboard([
            [
              Markup.button.callback("✅ Tasdiqlash", `approve_${order.id}`),
              Markup.button.callback("❌ Bekor qilish", `reject_${order.id}`),
            ],
          ])
        )
        .catch(() => undefined);
    }

    await ctx.scene.leave();
  } catch (err: any) {
    await ctx.reply(`❌ Xatolik: ${err?.message || "Buyurtmani saqlashda xatolik yuz berdi"}`);
  }
});

orderScene.on(message("text"), async (ctx) => {
  const text = ctx.message.text.trim();

  if (MENU_LABELS.includes(text)) {
    ctx.scene.session.pendingProductId = undefined;
    await ctx.scene.leave();
    await ctx.reply("Buyurtma jarayoni bekor qilindi. Menyudan qaytadan tanlang.", mainMenuKeyboard);
    return;
  }

  const pendingId = ctx.scene.session.pendingProductId;
  if (!pendingId) {
    await ctx.reply("Iltimos, avval katalogdan mahsulot tanlang.");
    return;
  }

  const qty = parseInt(text, 10);
  if (!qty || qty <= 0) {
    await ctx.reply("Iltimos, musbat butun son kiriting (masalan: 5):");
    return;
  }

  const product = await prisma.product.findUnique({ where: { id: pendingId } });
  if (!product) {
    await ctx.reply("Mahsulot topilmadi, qaytadan urinib ko'ring.");
    ctx.scene.session.pendingProductId = undefined;
    return;
  }
  if (qty > product.stock) {
    await ctx.reply(`Omborda faqat ${product.stock} dona bor. Kamroq son kiriting:`);
    return;
  }

  const cart = ctx.scene.session.cart ?? [];
  const existing = cart.find((i) => i.productId === product.id);
  if (existing) {
    existing.quantity += qty;
  } else {
    cart.push({ productId: product.id, name: product.name, price: product.price, quantity: qty });
  }
  ctx.scene.session.cart = cart;
  ctx.scene.session.pendingProductId = undefined;

  await ctx.reply(`✅ ${product.name} savatga qo'shildi (${qty} dona).\n\n${cartText(ctx)}`, cartActionsKeyboard);
});
