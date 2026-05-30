import { PrismaClient, OrderStatus, PaymentMethod, NotificationType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Clear in reverse dependency order
  await prisma.routeStop.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.territory.deleteMany();
  console.log("  ✓ Cleared existing data");

  // 1. Territories
  const territories = await Promise.all([
    prisma.territory.create({ data: { id: 1, name: "Chilonzor", region: "Toshkent" } }),
    prisma.territory.create({ data: { id: 2, name: "Yunusobod", region: "Toshkent" } }),
    prisma.territory.create({ data: { id: 3, name: "Mirzo Ulugbek", region: "Toshkent" } }),
    prisma.territory.create({ data: { id: 4, name: "Sergeli", region: "Toshkent" } }),
    prisma.territory.create({ data: { id: 5, name: "Bektemir", region: "Toshkent" } }),
    prisma.territory.create({ data: { id: 6, name: "Uchtepa", region: "Toshkent" } }),
  ]);
  console.log(`  ✓ ${territories.length} territories`);

  // 2. Warehouses
  const warehouses = await Promise.all([
    prisma.warehouse.create({ data: { id: 1, name: "Asosiy Ombor", location: "Chilonzor, Toshkent", manager: "Sherzod Nazarov", phone: "+998901234572", isActive: true } }),
    prisma.warehouse.create({ data: { id: 2, name: "Yunusobod Ombori", location: "Yunusobod, Toshkent", manager: "Barno Yusupova", phone: "+998901234580", isActive: true } }),
    prisma.warehouse.create({ data: { id: 3, name: "Janubiy Ombor", location: "Sergeli, Toshkent", manager: "Ulugbek Mirzaev", phone: "+998901234581", isActive: false } }),
  ]);
  console.log(`  ✓ ${warehouses.length} warehouses`);

  // 3. Agents
  const agents = await Promise.all([
    prisma.agent.create({ data: { id: 1, fullName: "Jasur Mirzayev", phone: "+998901234571", email: "agent@demo.com", territoryId: 1, monthlyTarget: 50_000_000, currentSales: 43_200_000, performance: 86.4, isActive: true, latitude: 41.2995, longitude: 69.2401, lastSeen: new Date(Date.now() - 15 * 60 * 1000) } }),
    prisma.agent.create({ data: { id: 2, fullName: "Bobur Qodirov", phone: "+998901234574", email: "bobur@demo.com", territoryId: 2, monthlyTarget: 45_000_000, currentSales: 41_000_000, performance: 91.1, isActive: true, latitude: 41.3223, longitude: 69.2871, lastSeen: new Date(Date.now() - 5 * 60 * 1000) } }),
    prisma.agent.create({ data: { id: 3, fullName: "Eldor Xasanov", phone: "+998901234575", email: "eldor@demo.com", territoryId: 3, monthlyTarget: 48_000_000, currentSales: 38_500_000, performance: 80.2, isActive: true, latitude: 41.3398, longitude: 69.3232, lastSeen: new Date(Date.now() - 30 * 60 * 1000) } }),
    prisma.agent.create({ data: { id: 4, fullName: "Kamol Tursunov", phone: "+998901234576", email: "kamol@demo.com", territoryId: 4, monthlyTarget: 40_000_000, currentSales: 35_200_000, performance: 88.0, isActive: true, latitude: 41.2456, longitude: 69.2112, lastSeen: new Date(Date.now() - 2 * 60 * 1000) } }),
    prisma.agent.create({ data: { id: 5, fullName: "Ravshan Normatov", phone: "+998901234577", email: "ravshan@demo.com", territoryId: 5, monthlyTarget: 35_000_000, currentSales: 28_900_000, performance: 82.6, isActive: true, latitude: 41.2834, longitude: 69.3518, lastSeen: new Date(Date.now() - 45 * 60 * 1000) } }),
    prisma.agent.create({ data: { id: 6, fullName: "Sanjar Yo'ldoshev", phone: "+998901234578", email: "sanjar@demo.com", territoryId: 6, monthlyTarget: 42_000_000, currentSales: 39_800_000, performance: 94.8, isActive: true, latitude: 41.3112, longitude: 69.2089, lastSeen: new Date(Date.now() - 8 * 60 * 1000) } }),
    prisma.agent.create({ data: { id: 7, fullName: "Otabek Sobirov", phone: "+998901234579", email: "otabek@demo.com", territoryId: 1, monthlyTarget: 38_000_000, currentSales: 22_100_000, performance: 58.2, isActive: false } }),
  ]);
  console.log(`  ✓ ${agents.length} agents`);

  // 4. Users (hashed passwords)
  const hash = (p: string) => bcrypt.hashSync(p, 10);
  const users = await Promise.all([
    prisma.user.create({ data: { id: 1, fullName: "Ahmad Karimov", email: "admin@demo.com", password: hash("admin123"), phone: "+998901234567", role: "SUPER_ADMIN", isActive: true } }),
    prisma.user.create({ data: { id: 2, fullName: "Sardor Toshmatov", email: "director@demo.com", password: hash("demo123"), phone: "+998901234568", role: "DIRECTOR", isActive: true } }),
    prisma.user.create({ data: { id: 3, fullName: "Nodira Yusupova", email: "supervisor@demo.com", password: hash("demo123"), phone: "+998901234569", role: "SUPERVISOR", isActive: true } }),
    prisma.user.create({ data: { id: 4, fullName: "Dilshod Rakhimov", email: "salesmanager@demo.com", password: hash("demo123"), phone: "+998901234570", role: "SALES_MANAGER", isActive: true } }),
    prisma.user.create({ data: { id: 5, fullName: "Jasur Mirzayev", email: "agent@demo.com", password: hash("demo123"), phone: "+998901234571", role: "SALES_AGENT", agentId: 1, isActive: true } }),
    prisma.user.create({ data: { id: 6, fullName: "Sherzod Nazarov", email: "warehouse@demo.com", password: hash("demo123"), phone: "+998901234572", role: "WAREHOUSE_OPERATOR", warehouseId: 1, isActive: true } }),
    prisma.user.create({ data: { id: 7, fullName: "Malika Hasanova", email: "accountant@demo.com", password: hash("demo123"), phone: "+998901234573", role: "ACCOUNTANT", isActive: true } }),
  ]);
  console.log(`  ✓ ${users.length} users`);

  // 5. Customers (35)
  const customerData = [
    { id: 1, companyName: "Baraka Savdo", ownerName: "Alisher Nazarov", phone: "+998901111001", district: "Chilonzor", territoryId: 1, agentId: 1, debt: 2_500_000, balance: 500_000, status: "ACTIVE" as const, latitude: 41.2965, longitude: 69.2390, lastVisit: new Date("2025-05-28T10:00:00Z") },
    { id: 2, companyName: "Nur Bozor", ownerName: "Saodat Raximova", phone: "+998901111002", district: "Chilonzor", territoryId: 1, agentId: 1, debt: 0, balance: 1_200_000, status: "ACTIVE" as const, latitude: 41.2980, longitude: 69.2410, lastVisit: new Date("2025-05-28T11:00:00Z") },
    { id: 3, companyName: "Gold Market", ownerName: "Tohir Usmonov", phone: "+998901111003", district: "Chilonzor", territoryId: 1, agentId: 1, debt: 5_100_000, balance: 0, status: "ACTIVE" as const, latitude: 41.2940, longitude: 69.2370, lastVisit: new Date("2025-05-27T09:00:00Z") },
    { id: 4, companyName: "Sham Do'koni", ownerName: "Feruza Qosimova", phone: "+998901111004", district: "Chilonzor", territoryId: 1, agentId: 1, debt: 0, balance: 800_000, status: "ACTIVE" as const, latitude: 41.2920, longitude: 69.2350, lastVisit: new Date("2025-05-27T12:00:00Z") },
    { id: 5, companyName: "Mehnat Savdo", ownerName: "Baxtiyor Xoliqov", phone: "+998901111005", district: "Chilonzor", territoryId: 1, agentId: 1, debt: 1_800_000, balance: 0, status: "ACTIVE" as const, latitude: 41.3010, longitude: 69.2430, lastVisit: new Date("2025-05-26T10:00:00Z") },
    { id: 6, companyName: "Inson Bozori", ownerName: "Gulnora Tojiboyeva", phone: "+998901111006", district: "Chilonzor", territoryId: 1, agentId: 1, debt: 0, balance: 2_000_000, status: "ACTIVE" as const, latitude: 41.3025, longitude: 69.2450, lastVisit: new Date("2025-05-28T14:00:00Z") },
    { id: 7, companyName: "Zulfiya Market", ownerName: "Zulfiya Yusupova", phone: "+998901111007", district: "Chilonzor", territoryId: 1, agentId: 1, debt: 3_200_000, balance: 0, status: "INACTIVE" as const, latitude: 41.2950, longitude: 69.2380, lastVisit: new Date("2025-05-20T09:00:00Z") },
    { id: 8, companyName: "Yangi Hayot", ownerName: "Doniyor Holmatov", phone: "+998901111008", district: "Yunusobod", territoryId: 2, agentId: 2, debt: 0, balance: 1_500_000, status: "ACTIVE" as const, latitude: 41.3210, longitude: 69.2840, lastVisit: new Date("2025-05-28T09:30:00Z") },
    { id: 9, companyName: "Baxt Market", ownerName: "Lola Hasanova", phone: "+998901111009", district: "Yunusobod", territoryId: 2, agentId: 2, debt: 4_500_000, balance: 0, status: "ACTIVE" as const, latitude: 41.3230, longitude: 69.2860, lastVisit: new Date("2025-05-27T11:00:00Z") },
    { id: 10, companyName: "Islom Savdo", ownerName: "Islom Qodirov", phone: "+998901111010", district: "Yunusobod", territoryId: 2, agentId: 2, debt: 0, balance: 3_000_000, status: "ACTIVE" as const, latitude: 41.3245, longitude: 69.2890, lastVisit: new Date("2025-05-28T13:00:00Z") },
    { id: 11, companyName: "Farrux Bozor", ownerName: "Farrux Xoliqov", phone: "+998901111011", district: "Yunusobod", territoryId: 2, agentId: 2, debt: 900_000, balance: 0, status: "ACTIVE" as const, latitude: 41.3200, longitude: 69.2820, lastVisit: new Date("2025-05-26T10:30:00Z") },
    { id: 12, companyName: "Ziyod Market", ownerName: "Ziyoda Rahimova", phone: "+998901111012", district: "Yunusobod", territoryId: 2, agentId: 2, debt: 0, balance: 700_000, status: "ACTIVE" as const, latitude: 41.3215, longitude: 69.2835, lastVisit: new Date("2025-05-28T08:00:00Z") },
    { id: 13, companyName: "Nargiza Savdo", ownerName: "Nargiza Xo'jayeva", phone: "+998901111013", district: "Yunusobod", territoryId: 2, agentId: 2, debt: 6_800_000, balance: 0, status: "ACTIVE" as const, latitude: 41.3250, longitude: 69.2900, lastVisit: new Date("2025-05-25T09:00:00Z") },
    { id: 14, companyName: "Abdulla Market", ownerName: "Abdulla Toshmatov", phone: "+998901111014", district: "Mirzo Ulugbek", territoryId: 3, agentId: 3, debt: 0, balance: 4_200_000, status: "ACTIVE" as const, latitude: 41.3380, longitude: 69.3200, lastVisit: new Date("2025-05-28T10:00:00Z") },
    { id: 15, companyName: "Umid Bozor", ownerName: "Umid Karimov", phone: "+998901111015", district: "Mirzo Ulugbek", territoryId: 3, agentId: 3, debt: 2_100_000, balance: 0, status: "ACTIVE" as const, latitude: 41.3400, longitude: 69.3240, lastVisit: new Date("2025-05-27T12:00:00Z") },
    { id: 16, companyName: "Sarvar Market", ownerName: "Sarvar Yo'ldoshev", phone: "+998901111016", district: "Mirzo Ulugbek", territoryId: 3, agentId: 3, debt: 0, balance: 1_800_000, status: "ACTIVE" as const, latitude: 41.3420, longitude: 69.3260, lastVisit: new Date("2025-05-28T11:00:00Z") },
    { id: 17, companyName: "Dilnoza Savdo", ownerName: "Dilnoza Hasanova", phone: "+998901111017", district: "Mirzo Ulugbek", territoryId: 3, agentId: 3, debt: 3_600_000, balance: 0, status: "ACTIVE" as const, latitude: 41.3360, longitude: 69.3180, lastVisit: new Date("2025-05-27T09:00:00Z") },
    { id: 18, companyName: "Komil Bozor", ownerName: "Komiljon Tursunov", phone: "+998901111018", district: "Mirzo Ulugbek", territoryId: 3, agentId: 3, debt: 0, balance: 900_000, status: "ACTIVE" as const, latitude: 41.3390, longitude: 69.3210, lastVisit: new Date("2025-05-28T14:30:00Z") },
    { id: 19, companyName: "Bahor Market", ownerName: "Bahor Sobirov", phone: "+998901111019", district: "Sergeli", territoryId: 4, agentId: 4, debt: 1_200_000, balance: 0, status: "ACTIVE" as const, latitude: 41.2440, longitude: 69.2090, lastVisit: new Date("2025-05-28T09:00:00Z") },
    { id: 20, companyName: "Tolib Savdo", ownerName: "Tolibjon Muxtorov", phone: "+998901111020", district: "Sergeli", territoryId: 4, agentId: 4, debt: 0, balance: 2_500_000, status: "ACTIVE" as const, latitude: 41.2460, longitude: 69.2130, lastVisit: new Date("2025-05-27T11:30:00Z") },
    { id: 21, companyName: "Maftuna Market", ownerName: "Maftuna Nazarova", phone: "+998901111021", district: "Sergeli", territoryId: 4, agentId: 4, debt: 4_700_000, balance: 0, status: "ACTIVE" as const, latitude: 41.2470, longitude: 69.2150, lastVisit: new Date("2025-05-26T10:00:00Z") },
    { id: 22, companyName: "Anvar Bozor", ownerName: "Anvar Sotvoldiyev", phone: "+998901111022", district: "Bektemir", territoryId: 5, agentId: 5, debt: 0, balance: 1_100_000, status: "ACTIVE" as const, latitude: 41.2820, longitude: 69.3500, lastVisit: new Date("2025-05-28T10:30:00Z") },
    { id: 23, companyName: "Zilola Market", ownerName: "Zilola Qurbonova", phone: "+998901111023", district: "Bektemir", territoryId: 5, agentId: 5, debt: 2_800_000, balance: 0, status: "ACTIVE" as const, latitude: 41.2840, longitude: 69.3530, lastVisit: new Date("2025-05-27T12:30:00Z") },
    { id: 24, companyName: "Husan Savdo", ownerName: "Husanboy Mirxo'jayev", phone: "+998901111024", district: "Uchtepa", territoryId: 6, agentId: 6, debt: 0, balance: 3_300_000, status: "ACTIVE" as const, latitude: 41.3100, longitude: 69.2070, lastVisit: new Date("2025-05-28T09:00:00Z") },
    { id: 25, companyName: "Shirin Bozor", ownerName: "Shirinoy Qodirov", phone: "+998901111025", district: "Uchtepa", territoryId: 6, agentId: 6, debt: 1_600_000, balance: 0, status: "ACTIVE" as const, latitude: 41.3120, longitude: 69.2100, lastVisit: new Date("2025-05-27T13:00:00Z") },
    { id: 26, companyName: "Ozoda Market", ownerName: "Ozoda Toshpulatova", phone: "+998901111026", district: "Chilonzor", territoryId: 1, agentId: 1, debt: 0, balance: 600_000, status: "ACTIVE" as const, latitude: 41.2955, longitude: 69.2395, lastVisit: new Date("2025-05-28T15:00:00Z") },
    { id: 27, companyName: "Hamid Savdo", ownerName: "Hamid Ergashev", phone: "+998901111027", district: "Yunusobod", territoryId: 2, agentId: 2, debt: 3_100_000, balance: 0, status: "ACTIVE" as const, latitude: 41.3205, longitude: 69.2845, lastVisit: new Date("2025-05-27T10:00:00Z") },
    { id: 28, companyName: "Nozima Market", ownerName: "Nozima Rahimova", phone: "+998901111028", district: "Mirzo Ulugbek", territoryId: 3, agentId: 3, debt: 0, balance: 2_200_000, status: "ACTIVE" as const, latitude: 41.3370, longitude: 69.3190, lastVisit: new Date("2025-05-28T12:00:00Z") },
    { id: 29, companyName: "Vohid Bozor", ownerName: "Vohid Xolmatov", phone: "+998901111029", district: "Sergeli", territoryId: 4, agentId: 4, debt: 800_000, balance: 0, status: "ACTIVE" as const, latitude: 41.2450, longitude: 69.2110, lastVisit: new Date("2025-05-26T11:00:00Z") },
    { id: 30, companyName: "Laylo Savdo", ownerName: "Laylo Mirzayeva", phone: "+998901111030", district: "Bektemir", territoryId: 5, agentId: 5, debt: 0, balance: 1_900_000, status: "ACTIVE" as const, latitude: 41.2850, longitude: 69.3540, lastVisit: new Date("2025-05-28T10:00:00Z") },
    { id: 31, companyName: "Toshkent Bozor", ownerName: "Murod Qosimov", phone: "+998901111031", district: "Uchtepa", territoryId: 6, agentId: 6, debt: 5_500_000, balance: 0, status: "ACTIVE" as const, latitude: 41.3115, longitude: 69.2095, lastVisit: new Date("2025-05-25T14:00:00Z") },
    { id: 32, companyName: "Mehr Market", ownerName: "Mehriban Saidova", phone: "+998901111032", district: "Chilonzor", territoryId: 1, agentId: 1, debt: 0, balance: 4_000_000, status: "ACTIVE" as const, latitude: 41.2975, longitude: 69.2405, lastVisit: new Date("2025-05-28T11:30:00Z") },
    { id: 33, companyName: "Mushtariy Savdo", ownerName: "Mushtariy Xasanova", phone: "+998901111033", district: "Yunusobod", territoryId: 2, agentId: 2, debt: 7_200_000, balance: 0, status: "ACTIVE" as const, latitude: 41.3240, longitude: 69.2880, lastVisit: new Date("2025-05-24T09:00:00Z") },
    { id: 34, companyName: "Xurshid Bozor", ownerName: "Xurshid Yusupov", phone: "+998901111034", district: "Mirzo Ulugbek", territoryId: 3, agentId: 3, debt: 0, balance: 1_400_000, status: "ACTIVE" as const, latitude: 41.3410, longitude: 69.3250, lastVisit: new Date("2025-05-28T13:30:00Z") },
    { id: 35, companyName: "Kamola Market", ownerName: "Kamola Nazarova", phone: "+998901111035", district: "Sergeli", territoryId: 4, agentId: 4, debt: 2_300_000, balance: 0, status: "BLOCKED" as const, latitude: 41.2435, longitude: 69.2085, lastVisit: new Date("2025-05-10T09:00:00Z") },
  ];
  for (const c of customerData) {
    await prisma.customer.create({
      data: { id: c.id, companyName: c.companyName, ownerName: c.ownerName, phone: c.phone, region: "Toshkent", district: c.district, address: `${c.district} ko'chasi, ${c.id}-uy`, territoryId: c.territoryId, agentId: c.agentId, debt: c.debt, balance: c.balance, status: c.status, latitude: c.latitude, longitude: c.longitude, lastVisit: c.lastVisit },
    });
  }
  console.log(`  ✓ ${customerData.length} customers`);

  // 6. Products (30)
  const productData = [
    { id: 1, sku: "BEV-001", barcode: "4600001000001", name: "Coca-Cola 0.5L", category: "Beverages", price: 8_000, wholesalePrice: 6_500, stock: 480, warehouseId: 1, isActive: true, minStock: 50 },
    { id: 2, sku: "BEV-002", barcode: "4600001000002", name: "Pepsi 0.5L", category: "Beverages", price: 7_500, wholesalePrice: 6_000, stock: 360, warehouseId: 1, isActive: true, minStock: 50 },
    { id: 3, sku: "BEV-003", barcode: "4600001000003", name: "Fanta Orange 0.5L", category: "Beverages", price: 7_500, wholesalePrice: 6_000, stock: 290, warehouseId: 1, isActive: true, minStock: 50 },
    { id: 4, sku: "BEV-004", barcode: "4600001000004", name: "Sprite 0.5L", category: "Beverages", price: 7_500, wholesalePrice: 6_000, stock: 310, warehouseId: 1, isActive: true, minStock: 50 },
    { id: 5, sku: "BEV-005", barcode: "4600001000005", name: "Lipton Ice Tea 0.5L", category: "Beverages", price: 9_000, wholesalePrice: 7_200, stock: 200, warehouseId: 1, isActive: true, minStock: 30 },
    { id: 6, sku: "BEV-006", barcode: "4600001000006", name: "Nestea 0.5L", category: "Beverages", price: 8_500, wholesalePrice: 6_800, stock: 40, warehouseId: 1, isActive: true, minStock: 50 },
    { id: 7, sku: "SNK-001", barcode: "4600002000001", name: "Lays Original 75g", category: "Snacks", price: 12_000, wholesalePrice: 9_500, stock: 320, warehouseId: 1, isActive: true, minStock: 40 },
    { id: 8, sku: "SNK-002", barcode: "4600002000002", name: "Lays Sour Cream 75g", category: "Snacks", price: 12_000, wholesalePrice: 9_500, stock: 280, warehouseId: 1, isActive: true, minStock: 40 },
    { id: 9, sku: "SNK-003", barcode: "4600002000003", name: "Pringles Original 165g", category: "Snacks", price: 25_000, wholesalePrice: 20_000, stock: 150, warehouseId: 2, isActive: true, minStock: 20 },
    { id: 10, sku: "SNK-004", barcode: "4600002000004", name: "Cheetos 80g", category: "Snacks", price: 11_000, wholesalePrice: 8_800, stock: 260, warehouseId: 1, isActive: true, minStock: 40 },
    { id: 11, sku: "DAI-001", barcode: "4600003000001", name: "Activia Yogurt 280g", category: "Dairy", price: 15_000, wholesalePrice: 12_000, stock: 180, warehouseId: 2, isActive: true, minStock: 30, expiryDate: new Date("2025-07-15"), batchNo: "DAI2025A" },
    { id: 12, sku: "DAI-002", barcode: "4600003000002", name: "Parmalat Milk 1L", category: "Dairy", price: 18_000, wholesalePrice: 14_500, stock: 220, warehouseId: 2, isActive: true, minStock: 50, expiryDate: new Date("2025-06-30"), batchNo: "DAI2025B" },
    { id: 13, sku: "DAI-003", barcode: "4600003000003", name: "Mascarpone 500g", category: "Dairy", price: 45_000, wholesalePrice: 36_000, stock: 80, warehouseId: 2, isActive: true, minStock: 15 },
    { id: 14, sku: "CHO-001", barcode: "4600004000001", name: "Snickers 50g", category: "Confectionery", price: 9_000, wholesalePrice: 7_000, stock: 500, warehouseId: 1, isActive: true, minStock: 80 },
    { id: 15, sku: "CHO-002", barcode: "4600004000002", name: "Twix 50g", category: "Confectionery", price: 9_000, wholesalePrice: 7_000, stock: 420, warehouseId: 1, isActive: true, minStock: 80 },
    { id: 16, sku: "CHO-003", barcode: "4600004000003", name: "KitKat 45g", category: "Confectionery", price: 9_500, wholesalePrice: 7_500, stock: 380, warehouseId: 1, isActive: true, minStock: 80 },
    { id: 17, sku: "CHO-004", barcode: "4600004000004", name: "Bounty 57g", category: "Confectionery", price: 9_000, wholesalePrice: 7_000, stock: 290, warehouseId: 1, isActive: true, minStock: 60 },
    { id: 18, sku: "WAT-001", barcode: "4600005000001", name: "Nestle Pure Life 1.5L", category: "Water", price: 5_000, wholesalePrice: 3_800, stock: 800, warehouseId: 1, isActive: true, minStock: 100 },
    { id: 19, sku: "WAT-002", barcode: "4600005000002", name: "Bonaqua 1.5L", category: "Water", price: 4_500, wholesalePrice: 3_400, stock: 650, warehouseId: 1, isActive: true, minStock: 100 },
    { id: 20, sku: "WAT-003", barcode: "4600005000003", name: "Evian 0.75L", category: "Water", price: 15_000, wholesalePrice: 12_000, stock: 120, warehouseId: 2, isActive: true, minStock: 20 },
    { id: 21, sku: "JUI-001", barcode: "4600006000001", name: "Capri-Sun Orange 200ml", category: "Juice", price: 6_000, wholesalePrice: 4_800, stock: 400, warehouseId: 1, isActive: true, minStock: 60 },
    { id: 22, sku: "JUI-002", barcode: "4600006000002", name: "J7 Apple 1L", category: "Juice", price: 14_000, wholesalePrice: 11_200, stock: 280, warehouseId: 1, isActive: true, minStock: 40 },
    { id: 23, sku: "JUI-003", barcode: "4600006000003", name: "Rich Mango 1L", category: "Juice", price: 14_000, wholesalePrice: 11_200, stock: 25, warehouseId: 1, isActive: true, minStock: 40 },
    { id: 24, sku: "COF-001", barcode: "4600007000001", name: "Nescafe Classic 190g", category: "Coffee/Tea", price: 65_000, wholesalePrice: 52_000, stock: 90, warehouseId: 2, isActive: true, minStock: 15 },
    { id: 25, sku: "COF-002", barcode: "4600007000002", name: "Lipton Yellow Label 100pcs", category: "Coffee/Tea", price: 35_000, wholesalePrice: 28_000, stock: 150, warehouseId: 2, isActive: true, minStock: 20 },
    { id: 26, sku: "HYG-001", barcode: "4600008000001", name: "Head & Shoulders 400ml", category: "Hygiene", price: 55_000, wholesalePrice: 44_000, stock: 130, warehouseId: 2, isActive: true, minStock: 20 },
    { id: 27, sku: "HYG-002", barcode: "4600008000002", name: "Ariel Pods 30pcs", category: "Hygiene", price: 85_000, wholesalePrice: 68_000, stock: 95, warehouseId: 2, isActive: true, minStock: 15 },
    { id: 28, sku: "HYG-003", barcode: "4600008000003", name: "Pampers Active 4 54pcs", category: "Hygiene", price: 120_000, wholesalePrice: 96_000, stock: 75, warehouseId: 2, isActive: true, minStock: 10 },
    { id: 29, sku: "BEV-007", barcode: "4600001000007", name: "Red Bull 250ml", category: "Beverages", price: 22_000, wholesalePrice: 17_600, stock: 160, warehouseId: 1, isActive: true, minStock: 30 },
    { id: 30, sku: "SNK-005", barcode: "4600002000005", name: "Oreo Original 176g", category: "Snacks", price: 18_000, wholesalePrice: 14_400, stock: 200, warehouseId: 1, isActive: true, minStock: 30 },
  ];
  for (const p of productData) {
    await prisma.product.create({ data: { ...p, image: `/products/${p.sku.toLowerCase()}.jpg` } });
  }
  console.log(`  ✓ ${productData.length} products`);

  // 7. Orders with items (15 recent)
  type OrderSeed = { id: number; customerId: number; agentId: number; status: OrderStatus; createdAt: Date; discount: number; deliveredAt?: Date; items: { productId: number; quantity: number; price: number; total: number }[] };
  const orderSeeds: OrderSeed[] = [
    { id: 1, customerId: 1, agentId: 1, status: "DELIVERED", createdAt: new Date("2025-05-28T09:00:00Z"), discount: 0, deliveredAt: new Date("2025-05-28T14:00:00Z"), items: [{ productId: 1, quantity: 48, price: 6_500, total: 312_000 }, { productId: 14, quantity: 24, price: 7_000, total: 168_000 }, { productId: 18, quantity: 24, price: 3_800, total: 91_200 }] },
    { id: 2, customerId: 2, agentId: 1, status: "DELIVERED", createdAt: new Date("2025-05-28T10:00:00Z"), discount: 0, deliveredAt: new Date("2025-05-28T15:00:00Z"), items: [{ productId: 2, quantity: 24, price: 6_000, total: 144_000 }, { productId: 7, quantity: 12, price: 9_500, total: 114_000 }] },
    { id: 3, customerId: 3, agentId: 1, status: "APPROVED", createdAt: new Date("2025-05-28T11:00:00Z"), discount: 50_000, items: [{ productId: 1, quantity: 96, price: 6_500, total: 624_000 }, { productId: 2, quantity: 48, price: 6_000, total: 288_000 }, { productId: 3, quantity: 48, price: 6_000, total: 288_000 }, { productId: 29, quantity: 12, price: 17_600, total: 211_200 }] },
    { id: 4, customerId: 8, agentId: 2, status: "DELIVERED", createdAt: new Date("2025-05-28T09:30:00Z"), discount: 0, deliveredAt: new Date("2025-05-28T13:30:00Z"), items: [{ productId: 11, quantity: 24, price: 12_000, total: 288_000 }, { productId: 12, quantity: 12, price: 14_500, total: 174_000 }, { productId: 25, quantity: 6, price: 28_000, total: 168_000 }] },
    { id: 5, customerId: 9, agentId: 2, status: "PENDING", createdAt: new Date("2025-05-28T11:00:00Z"), discount: 50_000, items: [{ productId: 26, quantity: 12, price: 44_000, total: 528_000 }, { productId: 27, quantity: 6, price: 68_000, total: 408_000 }, { productId: 28, quantity: 4, price: 96_000, total: 384_000 }] },
    { id: 6, customerId: 14, agentId: 3, status: "DELIVERED", createdAt: new Date("2025-05-28T08:30:00Z"), discount: 30_000, deliveredAt: new Date("2025-05-28T12:30:00Z"), items: [{ productId: 9, quantity: 24, price: 20_000, total: 480_000 }, { productId: 30, quantity: 24, price: 14_400, total: 345_600 }, { productId: 24, quantity: 6, price: 52_000, total: 312_000 }] },
    { id: 7, customerId: 19, agentId: 4, status: "DELIVERED", createdAt: new Date("2025-05-28T09:00:00Z"), discount: 0, deliveredAt: new Date("2025-05-28T14:00:00Z"), items: [{ productId: 18, quantity: 48, price: 3_800, total: 182_400 }, { productId: 19, quantity: 48, price: 3_400, total: 163_200 }, { productId: 21, quantity: 36, price: 4_800, total: 172_800 }] },
    { id: 8, customerId: 22, agentId: 5, status: "APPROVED", createdAt: new Date("2025-05-28T10:00:00Z"), discount: 0, items: [{ productId: 22, quantity: 12, price: 11_200, total: 134_400 }, { productId: 23, quantity: 12, price: 11_200, total: 134_400 }] },
    { id: 9, customerId: 24, agentId: 6, status: "DELIVERED", createdAt: new Date("2025-05-28T08:00:00Z"), discount: 0, deliveredAt: new Date("2025-05-28T13:00:00Z"), items: [{ productId: 1, quantity: 48, price: 6_500, total: 312_000 }, { productId: 14, quantity: 48, price: 7_000, total: 336_000 }, { productId: 15, quantity: 48, price: 7_000, total: 336_000 }, { productId: 16, quantity: 24, price: 7_500, total: 180_000 }] },
    { id: 10, customerId: 1, agentId: 1, status: "DRAFT", createdAt: new Date("2025-05-28T12:00:00Z"), discount: 0, items: [{ productId: 5, quantity: 24, price: 7_200, total: 172_800 }, { productId: 29, quantity: 12, price: 17_600, total: 211_200 }] },
    { id: 11, customerId: 16, agentId: 3, status: "DELIVERED", createdAt: new Date("2025-05-27T09:00:00Z"), discount: 20_000, deliveredAt: new Date("2025-05-27T14:00:00Z"), items: [{ productId: 18, quantity: 96, price: 3_800, total: 364_800 }, { productId: 19, quantity: 48, price: 3_400, total: 163_200 }, { productId: 20, quantity: 12, price: 12_000, total: 144_000 }] },
    { id: 12, customerId: 20, agentId: 4, status: "APPROVED", createdAt: new Date("2025-05-27T10:00:00Z"), discount: 0, items: [{ productId: 9, quantity: 12, price: 20_000, total: 240_000 }, { productId: 13, quantity: 6, price: 36_000, total: 216_000 }] },
    { id: 13, customerId: 10, agentId: 2, status: "DELIVERED", createdAt: new Date("2025-05-27T11:00:00Z"), discount: 30_000, deliveredAt: new Date("2025-05-27T15:00:00Z"), items: [{ productId: 7, quantity: 24, price: 9_500, total: 228_000 }, { productId: 8, quantity: 24, price: 9_500, total: 228_000 }, { productId: 10, quantity: 24, price: 8_800, total: 211_200 }] },
    { id: 14, customerId: 5, agentId: 1, status: "DELIVERED", createdAt: new Date("2025-05-27T09:30:00Z"), discount: 0, deliveredAt: new Date("2025-05-27T14:30:00Z"), items: [{ productId: 26, quantity: 6, price: 44_000, total: 264_000 }, { productId: 27, quantity: 6, price: 68_000, total: 408_000 }, { productId: 25, quantity: 6, price: 28_000, total: 168_000 }, { productId: 24, quantity: 3, price: 52_000, total: 156_000 }] },
    { id: 15, customerId: 25, agentId: 6, status: "DELIVERED", createdAt: new Date("2025-05-27T08:30:00Z"), discount: 0, deliveredAt: new Date("2025-05-27T13:30:00Z"), items: [{ productId: 1, quantity: 48, price: 6_500, total: 312_000 }, { productId: 2, quantity: 24, price: 6_000, total: 144_000 }, { productId: 18, quantity: 48, price: 3_800, total: 182_400 }] },
  ];
  for (const o of orderSeeds) {
    const subtotal = o.items.reduce((s, i) => s + i.total, 0);
    const total = subtotal - o.discount;
    await prisma.order.create({
      data: {
        id: o.id,
        orderNo: `ORD-2025-${String(o.id).padStart(4, "0")}`,
        customerId: o.customerId,
        agentId: o.agentId,
        status: o.status,
        subtotal,
        discount: o.discount,
        total,
        createdAt: o.createdAt,
        updatedAt: o.createdAt,
        deliveredAt: o.deliveredAt,
        items: { create: o.items.map(i => ({ productId: i.productId, quantity: i.quantity, price: i.price, total: i.total })) },
      },
    });
  }
  console.log(`  ✓ ${orderSeeds.length} orders`);

  // Historical orders for charts (past 11 months)
  const historicalAmounts = [28_500_000, 31_200_000, 35_800_000, 38_400_000, 33_100_000, 40_200_000, 42_500_000, 37_800_000, 44_100_000, 39_600_000, 45_800_000];
  let histId = 100;
  const now = new Date();
  for (let m = 11; m >= 1; m--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - m, 15);
    const target = historicalAmounts[11 - m] || 35_000_000;
    const numOrders = 4 + Math.floor(Math.random() * 3);
    const perOrder = Math.floor(target / numOrders);
    for (let o = 0; o < numOrders; o++) {
      const agentId = (o % 6) + 1;
      const customerId = (o % 6) + 1;
      const amount = perOrder + Math.floor(Math.random() * 2_000_000) - 1_000_000;
      const d = new Date(monthDate);
      d.setDate(d.getDate() + o * 5);
      await prisma.order.create({
        data: {
          id: histId++,
          orderNo: `ORD-HIST-${histId}`,
          customerId,
          agentId,
          status: "DELIVERED",
          subtotal: amount,
          discount: 0,
          total: amount,
          createdAt: d,
          updatedAt: d,
          deliveredAt: d,
          items: { create: [{ productId: 1, quantity: Math.floor(amount / 6_500), price: 6_500, total: amount }] },
        },
      });
    }
  }
  console.log(`  ✓ Historical orders for charts`);

  // 8. Payments
  const paymentData = [
    { id: 1, orderId: 1, customerId: 1, agentId: 1, amount: 571_200, method: "CASH" as PaymentMethod, createdAt: new Date("2025-05-28T14:30:00Z") },
    { id: 2, orderId: 4, customerId: 8, agentId: 2, amount: 630_000, method: "CASH" as PaymentMethod, createdAt: new Date("2025-05-28T14:00:00Z") },
    { id: 3, customerId: 3, agentId: 1, amount: 2_000_000, method: "BANK_TRANSFER" as PaymentMethod, note: "Qarzning bir qismi", createdAt: new Date("2025-05-28T11:30:00Z") },
    { id: 4, orderId: 6, customerId: 14, agentId: 3, amount: 1_107_600, method: "CARD" as PaymentMethod, createdAt: new Date("2025-05-28T13:00:00Z") },
    { id: 5, orderId: 7, customerId: 19, agentId: 4, amount: 518_400, method: "CASH" as PaymentMethod, createdAt: new Date("2025-05-28T14:30:00Z") },
    { id: 6, customerId: 9, agentId: 2, amount: 1_500_000, method: "CASH" as PaymentMethod, note: "Oldingi qarz uchun", createdAt: new Date("2025-05-27T16:00:00Z") },
    { id: 7, orderId: 9, customerId: 24, agentId: 6, amount: 1_144_000, method: "CASH" as PaymentMethod, createdAt: new Date("2025-05-28T13:30:00Z") },
    { id: 8, orderId: 14, customerId: 5, agentId: 1, amount: 1_178_800, method: "CARD" as PaymentMethod, createdAt: new Date("2025-05-27T15:30:00Z") },
    { id: 9, orderId: 15, customerId: 25, agentId: 6, amount: 680_400, method: "CASH" as PaymentMethod, createdAt: new Date("2025-05-27T16:30:00Z") },
    { id: 10, customerId: 13, agentId: 2, amount: 3_000_000, method: "BANK_TRANSFER" as PaymentMethod, note: "Qarzning to'lovi", createdAt: new Date("2025-05-27T12:00:00Z") },
  ];
  for (const p of paymentData) {
    await prisma.payment.create({ data: p });
  }
  console.log(`  ✓ ${paymentData.length} payments`);

  // 9. Notifications
  const notifData = [
    { id: 1, type: "NEW_ORDER" as NotificationType, title: "Yangi buyurtma", message: "Gold Market dan ORD-2025-0003 buyurtma keldi - 1,361,200 so'm", isRead: false, createdAt: new Date("2025-05-28T11:00:00Z") },
    { id: 2, type: "LOW_STOCK" as NotificationType, title: "Kam qoldiq", message: "Nestea 0.5L - faqat 40 ta qoldi (minimal: 50)", isRead: false, createdAt: new Date("2025-05-28T10:30:00Z") },
    { id: 3, type: "LOW_STOCK" as NotificationType, title: "Kam qoldiq", message: "Rich Mango 1L - faqat 25 ta qoldi (minimal: 40)", isRead: false, createdAt: new Date("2025-05-28T10:00:00Z") },
    { id: 4, type: "DEBT_REMINDER" as NotificationType, title: "Qarz eslatmasi", message: "Nargiza Savdo qarzi: 6,800,000 so'm. 15 kundan ortiq muddati o'tgan", isRead: false, createdAt: new Date("2025-05-28T09:00:00Z") },
    { id: 5, type: "TARGET_ACHIEVED" as NotificationType, title: "Maqsad bajarildi!", message: "Sanjar Yo'ldoshev oylik maqsadining 94.8% ni bajardi!", isRead: true, createdAt: new Date("2025-05-28T08:00:00Z") },
    { id: 6, type: "PAYMENT_RECEIVED" as NotificationType, title: "To'lov qabul qilindi", message: "Abdulla Market dan 1,107,600 so'm to'lov olindi", isRead: true, createdAt: new Date("2025-05-28T13:00:00Z") },
    { id: 7, type: "NEW_ORDER" as NotificationType, title: "Yangi buyurtma", message: "Baxt Market dan ORD-2025-0005 buyurtma keldi - 1,270,000 so'm", isRead: true, createdAt: new Date("2025-05-28T11:00:00Z") },
    { id: 8, type: "DEBT_REMINDER" as NotificationType, title: "Kritik qarz", message: "Mushtariy Savdo qarzi: 7,200,000 so'm - KRITIK holat!", isRead: false, createdAt: new Date("2025-05-27T09:00:00Z") },
  ];
  await prisma.notification.createMany({ data: notifData });
  console.log(`  ✓ ${notifData.length} notifications`);

  // 10. Route stops for today
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const todayStart = new Date(`${todayStr}T00:00:00Z`);
  const routeData = [
    { id: 1, agentId: 1, customerId: 2, plannedTime: new Date(`${todayStr}T09:00:00Z`), status: "VISITED", orderId: 2, collectionAmount: 0, date: todayStart, order: 1 },
    { id: 2, agentId: 1, customerId: 1, plannedTime: new Date(`${todayStr}T10:00:00Z`), status: "VISITED", orderId: 1, collectionAmount: 571_200, date: todayStart, order: 2 },
    { id: 3, agentId: 1, customerId: 3, plannedTime: new Date(`${todayStr}T11:00:00Z`), status: "VISITED", orderId: 3, collectionAmount: 2_000_000, date: todayStart, order: 3 },
    { id: 4, agentId: 1, customerId: 4, plannedTime: new Date(`${todayStr}T12:00:00Z`), status: "PENDING", date: todayStart, order: 4 },
    { id: 5, agentId: 1, customerId: 5, plannedTime: new Date(`${todayStr}T13:00:00Z`), status: "PENDING", date: todayStart, order: 5 },
    { id: 6, agentId: 1, customerId: 6, plannedTime: new Date(`${todayStr}T14:00:00Z`), status: "PENDING", date: todayStart, order: 6 },
    { id: 7, agentId: 1, customerId: 26, plannedTime: new Date(`${todayStr}T15:00:00Z`), status: "PENDING", date: todayStart, order: 7 },
    { id: 8, agentId: 2, customerId: 8, plannedTime: new Date(`${todayStr}T09:00:00Z`), status: "VISITED", orderId: 4, collectionAmount: 630_000, date: todayStart, order: 1 },
    { id: 9, agentId: 2, customerId: 9, plannedTime: new Date(`${todayStr}T10:00:00Z`), status: "VISITED", orderId: 5, collectionAmount: 1_500_000, date: todayStart, order: 2 },
    { id: 10, agentId: 2, customerId: 10, plannedTime: new Date(`${todayStr}T11:00:00Z`), status: "PENDING", date: todayStart, order: 3 },
  ];
  for (const r of routeData) {
    await prisma.routeStop.create({ data: r });
  }
  console.log(`  ✓ ${routeData.length} route stops`);

  console.log("\n✅ Database seeded successfully!");
  console.log("\n🔑 Demo credentials:");
  console.log("   Admin:     admin@demo.com / admin123");
  console.log("   Agent:     agent@demo.com / demo123");
  console.log("   Director:  director@demo.com / demo123");
}

main()
  .catch((e) => { console.error("❌ Seed failed:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
