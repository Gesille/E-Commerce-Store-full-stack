import express from "express";
import {
  getCategoryBreakdown,
  getKpiSummary,
  getLowStock,
  getPaymentMethodsSplit,
  getPeakHoursHeatmap,
  getRecentOrders,
  getRevenueChart,
  getRevenueTarget,
  getSessionInfo,
  getStaffPerformance,
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
  "/payment-methods",
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
  "/low-stock",
  isAuthenticated,
  authorizeRoles("admin", "cashier"),
  getLowStock,
);

AnalyticsRouter.get(
  "/heatmap",
  isAuthenticated,
  authorizeRoles("admin", "cashier"),
  getPeakHoursHeatmap,
);

export default AnalyticsRouter;
