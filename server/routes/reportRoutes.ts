import express from "express";
import {
  getMonthlySalesReport,
  getDailySalesReport,
  getProductSalesReport,
  getInventoryMovementReport,
  exportDailySalesReport,
  exportInventoryReport,
  exportMonthlySalesReport,
  exportProductSalesReport,
} from "../controllers/reportsController.js";
import { isAuthenticated, authorizeRoles } from "../middleware/auth.js";

const reportRouter = express.Router();

// GET /api/reports/sales/monthly?year=2025
reportRouter.get(
  "/sales/monthly",
  isAuthenticated,
  authorizeRoles("admin"),
  getMonthlySalesReport,
);

// GET /api/reports/sales/daily?year=2025&month=5
reportRouter.get(
  "/sales/daily",
  isAuthenticated,
  authorizeRoles("admin"),
  getDailySalesReport,
);

// GET /api/reports/sales/products?date_from=2025-01-01&date_to=2025-05-31
reportRouter.get(
  "/sales/products",
  isAuthenticated,
  authorizeRoles("admin"),
  getProductSalesReport,
);

// GET /api/reports/inventory/movements?date_from=2025-01-01&date_to=2025-05-31
reportRouter.get(
  "/inventory/movements",
  isAuthenticated,
  authorizeRoles("admin"),
  getInventoryMovementReport,
);

reportRouter.get(
  "/sales/monthly/export",
  isAuthenticated,
  authorizeRoles("admin"),
  exportMonthlySalesReport,
);

reportRouter.get(
  "/sales/daily/export",
  isAuthenticated,
  authorizeRoles("admin"),
  exportDailySalesReport,
);

reportRouter.get(
  "/sales/products/export",
  isAuthenticated,
  authorizeRoles("admin"),
  exportProductSalesReport,
);

reportRouter.get(
  "/inventory/export",
  isAuthenticated,
  authorizeRoles("admin"),
  exportInventoryReport,
);
export default reportRouter;
