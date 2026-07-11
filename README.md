# 🚀 FMCG Distribution ERP + CRM + Agent Management System

Enterprise-grade Distribution ERP platform for FMCG companies — built with Next.js 14, Express.js, TypeScript, TailwindCSS, and Docker.

---

## 📦 Services

| Service | Port | Description |
|---------|------|-------------|
| `admin-panel` | **3000** | Enterprise Admin Web Panel |
| `agent-app` | **3001** | Sales Agent Mobile App |
| `api` | **4000** | Express.js REST API |
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
└── agent-app/               # Next.js 14 Mobile Agent App
    └── src/app/             # Mobile-first pages
```

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
```

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, TypeScript, TailwindCSS, Recharts, SWR, Axios
- **Backend**: Express.js, TypeScript, JWT authentication
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
