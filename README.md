# 🚀 FMCG Distribution ERP + CRM + Agent Management System

Enterprise-grade Distribution ERP platform for FMCG companies — built with Next.js 14, Express.js, TypeScript, TailwindCSS, and Docker.

---

## 📦 Services

| Service | Port | Description |
|---------|------|-------------|
| `admin-panel` | **3000** | Enterprise Admin Web Panel |
| `agent-app` | **3001** | Sales Agent Mobile App |
| `api` | **4000** | Express.js REST API |
| `telegram-bot` | — | Telegram bot for B2B customers to order directly |
| `redis` | **6379** | Redis Cache |

---

## 🚀 Quick Start

```bash
# Clone & run
docker-compose up --build

# Or run individually (dev mode)
cd api && npm install && npm run dev
cd admin-panel && npm install && npm run dev
cd agent-app && npm install && npm run dev
cd telegram-bot && npm install && npm run dev
```

Open:
- **Admin Panel**: http://localhost:3000
- **Agent App**: http://localhost:3001
- **API Docs**: http://localhost:4000/health

---

## 🔑 Demo Login Credentials

### Admin Panel (localhost:3000)
| Role | Email | Password |
|------|-------|---------|
| Super Admin | admin@demo.com | admin123 |
| Director | director@demo.com | demo123 |
| Sales Manager | salesmanager@demo.com | demo123 |
| Accountant | accountant@demo.com | demo123 |

### Agent Mobile App (localhost:3001)
| Role | Email | Password |
|------|-------|---------|
| Sales Agent | agent@demo.com | demo123 |

---

## 📱 Features

### Admin Panel
- 📊 **Dashboard** — KPI cards, 4 interactive charts (sales trends, order status, agent performance, weekly orders)
- 🛒 **Orders** — filterable table with status management
- 👥 **Customers** — card grid with debt/balance tracking
- 📦 **Products** — inventory with low-stock alerts
- 🏭 **Warehouses** — multi-warehouse management
- 📋 **Inventory** — stock level monitoring
- 👤 **Agents** — GPS-tracked agent performance cards
- 🗺️ **Territories** — territory revenue breakdown
- 💳 **Payments** — collections history + debt aging
- 📈 **Reports** — sales, agent, and debt reports
- 📉 **Analytics** — category and territory revenue charts
- 🤝 **CRM** — top customers + debt aging analysis
- 🔔 **Notifications** — real-time alerts
- ⚙️ **Settings** — profile, notifications, security

### Agent Mobile App
- 🏠 **Home** — daily target progress, route completion, quick actions
- 👥 **Customers** — searchable list with debt indicators
- 🛒 **Orders** — create multi-step orders with product picker
- 📍 **Route Plan** — step-by-step visit schedule with navigation
- 💰 **Collections** — record cash/card payments
- 💸 **Debts** — customer debt overview
- 📊 **Reports** — personal performance stats
- 👤 **Profile** — agent info and settings

### Telegram B2B Order Bot
- 📱 **Self-service linking** — customer shares their phone contact once; the bot matches it to their existing B2B customer record
- 📦 **Katalog** — browse products by category with wholesale pricing and live stock
- 🛒 **Buyurtma berish** — build a cart, adjust quantities, then submit the order (created as `PENDING`, ready for manager approval)
- 📋 **Buyurtmalarim** — last 10 orders with status and line items
- 💰 **Balansim** — current balance, debt, and assigned agent contact
- Talks to the ERP API through dedicated `/api/bot/*` endpoints (shared-secret auth) so pricing/stock/order numbering stay authoritative on the server

---

## 🏗️ Architecture

```
mdmn7x/
├── docker-compose.yml       # One-command startup
├── api/                     # Express.js REST API
│   ├── src/
│   │   ├── data/            # In-memory seed data (demo)
│   │   ├── routes/          # All API routes
│   │   ├── middleware/       # JWT auth, RBAC, error handling
│   │   └── index.ts         # Server entry point
│   └── prisma/schema.prisma # Full DB schema (production reference)
├── admin-panel/             # Next.js 14 Admin Web App
│   └── src/app/             # App Router pages
├── agent-app/               # Next.js 14 Mobile Agent App
│   └── src/app/             # Mobile-first pages
└── telegram-bot/            # Telegraf B2B order bot
    └── src/
        ├── handlers/        # /start, contact linking, main menu
        ├── scenes/          # Cart/checkout wizard scene
        └── lib/api.ts        # Client for the api's /api/bot/* endpoints
```

---

## 🤖 Telegram Bot Setup

1. Create a bot with [@BotFather](https://t.me/BotFather) and copy the token.
2. Copy `telegram-bot/.env.example` to `telegram-bot/.env` and set `BOT_TOKEN`.
3. Set the same `BOT_API_KEY` in both `api/.env` and `telegram-bot/.env` (or `docker-compose.yml`) — it's the shared secret between the two services.
4. Existing customers are matched by phone number, so a customer must already exist in the `Customer` table (with a matching `phone`) before they can link their Telegram account.
5. Start it: `cd telegram-bot && npm install && npm run dev` (or via `docker-compose up telegram-bot`).

---

## 🔌 API Endpoints

```
POST /api/auth/login           # Login
GET  /api/dashboard/kpis       # KPI data
GET  /api/dashboard/charts     # Chart data
GET  /api/customers            # Customer list (paginated)
GET  /api/products             # Product catalog
GET  /api/orders               # Order list
POST /api/orders               # Create order
PUT  /api/orders/:id/status    # Update order status
GET  /api/agents               # Agent list + live locations
GET  /api/agents/:id           # Agent detail + today's route
GET  /api/warehouses           # Warehouse list
GET  /api/payments             # Payment history
POST /api/payments             # Record payment
GET  /api/payments/debts       # Debt list
GET  /api/reports/sales        # Sales report
GET  /api/reports/agents       # Agent report
GET  /api/reports/debts        # Debt report
GET  /api/analytics/overview   # Full analytics
GET  /api/notifications        # Notifications
GET  /api/route-stops/today    # Today's route stops
GET  /api/crm/top-customers    # Top customers
GET  /api/crm/debt-aging       # Debt aging analysis

# Telegram bot (requires x-bot-api-key header instead of JWT)
POST /api/bot/link                       # Link a Telegram chat to a customer by phone
GET  /api/bot/customers/:chatId          # Linked customer profile (debt/balance/agent)
GET  /api/bot/customers/:chatId/orders   # Linked customer's order history
GET  /api/bot/products                   # Product catalog (wholesale price)
GET  /api/bot/products/categories        # Distinct product categories
POST /api/bot/orders                     # Create an order for the linked customer
```

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, TypeScript, TailwindCSS, Recharts, SWR, Axios
- **Backend**: Express.js, TypeScript, JWT authentication
- **Bot**: Telegraf (Telegram), TypeScript
- **Database Schema**: PostgreSQL + Prisma ORM (schema included)
- **Cache**: Redis
- **Deployment**: Docker + Docker Compose

> **Note**: The demo uses in-memory data that resets on container restart. For production, connect Prisma to PostgreSQL and run `prisma migrate`.

---

## 📊 Demo Data

- **35** customers across 6 territories
- **30** products (8 categories: Beverages, Snacks, Dairy, Confectionery, Water, Juice, Coffee/Tea, Hygiene)
- **15** orders with realistic amounts
- **7** agents (6 active)
- **6** territories in Tashkent
- **3** warehouses
- **12 months** of sales data for charts

---

Built with ❤️ for FMCG Distribution Companies | Similar to Smartup, Sales Doctor, SAP B1
