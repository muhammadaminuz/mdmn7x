import { Router, Request, Response } from "express";
import { botAuthenticate } from "../middleware/botAuth";
import prisma from "../lib/prisma";
import { generateOrderNo } from "../lib/orderNo";
import { samePhone } from "../lib/phone";

const router = Router();
router.use(botAuthenticate);

function mapCustomer(c: any) {
  return {
    id: c.id,
    companyName: c.companyName,
    ownerName: c.ownerName,
    phone: c.phone,
    region: c.region,
    district: c.district,
    address: c.address,
    debt: Number(c.debt),
    balance: Number(c.balance),
    status: c.status,
    agentId: c.agentId,
    agentName: c.agent?.fullName ?? "",
    agentPhone: c.agent?.phone ?? "",
  };
}

function mapProduct(p: any) {
  return {
    id: p.id,
    sku: p.sku,
    name: p.name,
    category: p.category,
    price: Number(p.wholesalePrice),
    stock: p.stock,
  };
}

async function findCustomerByPhone(phone: string) {
  const customers = await prisma.customer.findMany({ include: { agent: true } });
  return customers.find((c) => samePhone(c.phone, phone)) ?? null;
}

// Link a Telegram chat to an existing B2B customer by phone number.
router.post("/link", async (req: Request, res: Response) => {
  try {
    const { phone, chatId, username } = req.body;
    if (!phone || !chatId) return res.status(400).json({ error: "phone va chatId talab qilinadi" });

    const existing = await prisma.customer.findUnique({ where: { telegramChatId: String(chatId) } });
    if (existing) return res.status(200).json(mapCustomer({ ...existing, agent: await prisma.agent.findUnique({ where: { id: existing.agentId } }) }));

    const customer = await findCustomerByPhone(String(phone));
    if (!customer) return res.status(404).json({ error: "Mijoz topilmadi" });

    const updated = await prisma.customer.update({
      where: { id: customer.id },
      data: { telegramChatId: String(chatId), telegramUsername: username ?? null, telegramLinkedAt: new Date() },
      include: { agent: true },
    });
    return res.json(mapCustomer(updated));
  } catch (err: any) {
    console.error("Bot link failed:", err);
    return res.status(500).json({ error: err?.message || "Internal server error" });
  }
});

router.get("/customers/:chatId", async (req: Request, res: Response) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { telegramChatId: String(req.params.chatId) },
      include: { agent: true },
    });
    if (!customer) return res.status(404).json({ error: "Mijoz bog'lanmagan" });
    return res.json(mapCustomer(customer));
  } catch (err: any) {
    console.error("Bot customer read failed:", err);
    return res.status(500).json({ error: err?.message || "Internal server error" });
  }
});

router.get("/customers/:chatId/orders", async (req: Request, res: Response) => {
  try {
    const customer = await prisma.customer.findUnique({ where: { telegramChatId: String(req.params.chatId) } });
    if (!customer) return res.status(404).json({ error: "Mijoz bog'lanmagan" });

    const orders = await prisma.order.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { items: { include: { product: { select: { name: true } } } } },
    });
    res.json(
      orders.map((o) => ({
        id: o.id,
        orderNo: o.orderNo,
        status: o.status,
        total: Number(o.total),
        createdAt: o.createdAt?.toISOString(),
        items: o.items.map((i) => ({ productName: i.product?.name ?? "", quantity: i.quantity, price: Number(i.price), total: Number(i.total) })),
      }))
    );
  } catch (err: any) {
    console.error("Bot order history failed:", err);
    return res.status(500).json({ error: err?.message || "Internal server error" });
  }
});

router.get("/products", async (req: Request, res: Response) => {
  try {
    const { category, search } = req.query;
    const where: any = { isActive: true, stock: { gt: 0 } };
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: "insensitive" } },
        { sku: { contains: String(search), mode: "insensitive" } },
      ];
    }
    const products = await prisma.product.findMany({ where, orderBy: { name: "asc" }, take: 50 });
    res.json(products.map(mapProduct));
  } catch (err: any) {
    console.error("Bot product list failed:", err);
    return res.status(500).json({ error: err?.message || "Internal server error" });
  }
});

router.get("/products/categories", async (_req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true, stock: { gt: 0 } },
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    });
    res.json(products.map((p) => p.category));
  } catch (err: any) {
    console.error("Bot category list failed:", err);
    return res.status(500).json({ error: err?.message || "Internal server error" });
  }
});

router.post("/orders", async (req: Request, res: Response) => {
  try {
    const { chatId, items, note } = req.body;
    if (!chatId) return res.status(400).json({ error: "chatId talab qilinadi" });
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Kamida bitta mahsulot tanlang" });
    }

    const customer = await prisma.customer.findUnique({ where: { telegramChatId: String(chatId) } });
    if (!customer) return res.status(404).json({ error: "Mijoz bog'lanmagan" });
    if (customer.status === "BLOCKED") return res.status(403).json({ error: "Mijoz bloklangan, buyurtma berib bo'lmaydi" });

    const productIds = items.map((i: any) => Number(i.productId));
    const products = await prisma.product.findMany({ where: { id: { in: productIds }, isActive: true } });
    const productMap = new Map(products.map((p) => [p.id, p]));

    const orderItems = items.map((i: any) => {
      const product = productMap.get(Number(i.productId));
      if (!product) throw new Error(`Mahsulot topilmadi: ${i.productId}`);
      const quantity = Number(i.quantity);
      if (!quantity || quantity <= 0) throw new Error(`Noto'g'ri miqdor: ${product.name}`);
      const price = Number(product.wholesalePrice);
      const total = price * quantity;
      return { productId: product.id, quantity, price, total };
    });

    const subtotal = orderItems.reduce((s, i) => s + i.total, 0);
    const orderNo = await generateOrderNo();

    const order = await prisma.order.create({
      data: {
        orderNo,
        customerId: customer.id,
        agentId: customer.agentId,
        status: "PENDING",
        subtotal,
        discount: 0,
        total: subtotal,
        note: note || "Telegram bot orqali",
        items: { create: orderItems },
      },
      include: { items: { include: { product: { select: { name: true } } } } },
    });

    await prisma.notification.create({
      data: {
        type: "NEW_ORDER",
        title: "Yangi buyurtma (Telegram)",
        message: `${customer.companyName} kompaniyasidan ${orderNo} raqamli buyurtma tushdi`,
      },
    });

    res.status(201).json({
      id: order.id,
      orderNo: order.orderNo,
      status: order.status,
      total: Number(order.total),
      items: order.items.map((i) => ({ productName: i.product?.name ?? "", quantity: i.quantity, price: Number(i.price), total: Number(i.total) })),
    });
  } catch (err: any) {
    console.error("Bot order create failed:", err);
    return res.status(400).json({ error: err?.message || "Buyurtmani saqlashda xatolik yuz berdi" });
  }
});

export default router;
