import express from "express";
import {
  getCategoryBreakdown,
  getCustomerInsights,
  getDiscounts,
  getKpiSummary,
  getLowStockAlerts,
  getPaymentMethodsSplit,
  getPeakHoursHeatmap,
  getRecentOrders,
  getRevenueChart,
  getRevenueTarget,
  getSessionInfo,
  getStaffPerformance,
  getTableStatus,
  getTopProducts,
} from "../controllers/pos.analytics.controller.js";
import { authorizeRoles, isAuthenticated } from "../middleware/auth.js";

const AnalyticsRouter = express.Router();

AnalyticsRouter.get(
  "/summary",
  isAuthenticated,
  authorizeRoles("admin", "cashier"),
  getKpiSummary,
);

AnalyticsRouter.get(
  "/revenue-chart",
  isAuthenticated,
  authorizeRoles("admin", "cashier"),
  getRevenueChart,
);

AnalyticsRouter.get(
  "/top-products",
  isAuthenticated,
  authorizeRoles("admin", "cashier"),
  getTopProducts,
);

AnalyticsRouter.get(
  "/recent-orders",
  isAuthenticated,
  authorizeRoles("admin", "cashier"),
  getRecentOrders,
);

AnalyticsRouter.get(
  "/payment-methods/split",
  isAuthenticated,
  authorizeRoles("admin", "cashier"),
  getPaymentMethodsSplit,
);

AnalyticsRouter.get(
  "/categories",
  isAuthenticated,
  authorizeRoles("admin", "cashier"),
  getCategoryBreakdown,
);

AnalyticsRouter.get(
  "/staff",
  isAuthenticated,
  authorizeRoles("admin", "cashier"),
  getStaffPerformance,
);

AnalyticsRouter.get(
  "/target",
  isAuthenticated,
  authorizeRoles("admin", "cashier"),
  getRevenueTarget,
);

AnalyticsRouter.get(
  "/session-info",
  isAuthenticated,
  authorizeRoles("admin", "cashier"),
  getSessionInfo,
);

AnalyticsRouter.get(
  "/low-stock-alerts",
  isAuthenticated,
  authorizeRoles("admin", "cashier"),
  getLowStockAlerts,
);

AnalyticsRouter.get(
  "/heatmap",
  isAuthenticated,
  authorizeRoles("admin", "cashier"),
  getPeakHoursHeatmap,
);
AnalyticsRouter.get(
  "/tables",
  isAuthenticated,
  authorizeRoles("admin", "cashier"),
  getTableStatus,
);
AnalyticsRouter.get(
  "/discounts",
  isAuthenticated,
  authorizeRoles("admin", "cashier"),
  getDiscounts,
);
AnalyticsRouter.get(
  "/customers",
  isAuthenticated,
  authorizeRoles("admin", "cashier"),
  getCustomerInsights,
);

export default AnalyticsRouter;
