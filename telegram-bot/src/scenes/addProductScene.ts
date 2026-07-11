import { Scenes } from "telegraf";
import { message } from "telegraf/filters";
import { BotContext } from "../types";
import prisma from "../lib/prisma";

export const addProductScene = new Scenes.BaseScene<BotContext>("addProduct");

addProductScene.enter(async (ctx) => {
  ctx.scene.session.newProduct = {};
  await ctx.reply("➕ Yangi mahsulot qo'shish\n\nMahsulot nomini kiriting (bekor qilish uchun /bekor):");
});

addProductScene.command("bekor", async (ctx) => {
  ctx.scene.session.newProduct = undefined;
  await ctx.reply("Bekor qilindi.");
  await ctx.scene.leave();
});

addProductScene.on(message("text"), async (ctx) => {
  const draft = ctx.scene.session.newProduct ?? {};
  const text = ctx.message.text.trim();

  if (!draft.name) {
    if (text.length < 2) {
      await ctx.reply("Iltimos, mahsulot nomini to'liqroq kiriting:");
      return;
    }
    draft.name = text;
    ctx.scene.session.newProduct = draft;
    await ctx.reply("Toifasini kiriting (masalan: Ichimliklar, Shirinliklar):");
    return;
  }

  if (!draft.category) {
    draft.category = text;
    ctx.scene.session.newProduct = draft;
    await ctx.reply("Narxini kiriting (so'mda, faqat raqam, masalan: 15000):");
    return;
  }

  if (draft.price === undefined) {
    const price = Number(text.replace(/[^\d.]/g, ""));
    if (!price || price <= 0) {
      await ctx.reply("Iltimos, to'g'ri narx kiriting (masalan: 15000):");
      return;
    }
    draft.price = price;
    ctx.scene.session.newProduct = draft;
    await ctx.reply("Qoldiq miqdorini kiriting (dona, masalan: 100):");
    return;
  }

  const stock = parseInt(text, 10);
  if (!Number.isInteger(stock) || stock < 0) {
    await ctx.reply("Iltimos, musbat butun son kiriting (masalan: 100):");
    return;
  }

  const product = await prisma.product.create({
    data: { name: draft.name, category: draft.category, price: draft.price, stock },
  });
  ctx.scene.session.newProduct = undefined;

  await ctx.reply(
    `✅ Mahsulot qo'shildi!\n\n📦 ${product.name}\n🏷 ${product.category}\n💵 ${product.price.toLocaleString("uz-UZ")} so'm\n📊 ${product.stock} dona`
  );
  await ctx.scene.leave();
});
