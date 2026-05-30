import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import { errorHandler } from "./middleware/errorHandler";

import authRouter from "./routes/auth";
import dashboardRouter from "./routes/dashboard";
import customersRouter from "./routes/customers";
import productsRouter from "./routes/products";
import ordersRouter from "./routes/orders";
import agentsRouter from "./routes/agents";
import warehousesRouter from "./routes/warehouses";
import territoriesRouter from "./routes/territories";
import paymentsRouter from "./routes/payments";
import reportsRouter from "./routes/reports";
import analyticsRouter from "./routes/analytics";
import notificationsRouter from "./routes/notifications";
import crmRouter from "./routes/crm";
import routesRouter from "./routes/routes";
import suppliersRouter from "./routes/suppliers";
import stockMovementsRouter from "./routes/stock-movements";
import returnsRouter from "./routes/returns";
import expensesRouter from "./routes/expenses";
import bonusesRouter from "./routes/bonuses";
import gpsRouter from "./routes/gps";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(cors({ origin: "*", credentials: true }));
app.use(compression());
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (_req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

app.use("/api/auth", authRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/customers", customersRouter);
app.use("/api/products", productsRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/agents", agentsRouter);
app.use("/api/warehouses", warehousesRouter);
app.use("/api/territories", territoriesRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/crm", crmRouter);
app.use("/api/route-stops", routesRouter);
app.use("/api/suppliers", suppliersRouter);
app.use("/api/stock-movements", stockMovementsRouter);
app.use("/api/returns", returnsRouter);
app.use("/api/expenses", expensesRouter);
app.use("/api/bonuses", bonusesRouter);
app.use("/api/gps", gpsRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 FMCG Distribution ERP API running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`\nDemo credentials:`);
  console.log(`  Admin:     admin@demo.com / admin123`);
  console.log(`  Agent:     agent@demo.com / demo123`);
  console.log(`  Director:  director@demo.com / demo123`);
});

export default app;
