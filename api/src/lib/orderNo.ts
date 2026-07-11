import prisma from "./prisma";

// findFirst with orderBy desc is lexicographic, not numeric, so scan and take the true max sequence for the year.
export async function generateOrderNo(): Promise<string> {
  const year = new Date().getFullYear();
  const yearOrders = await prisma.order.findMany({
    where: { orderNo: { startsWith: `ORD-${year}-` } },
    select: { orderNo: true },
  });
  const maxSeq = yearOrders.reduce((max, o) => {
    const n = parseInt(o.orderNo.slice(-4), 10);
    return isNaN(n) ? max : Math.max(max, n);
  }, 0);
  return `ORD-${year}-${String(maxSeq + 1).padStart(4, "0")}`;
}
