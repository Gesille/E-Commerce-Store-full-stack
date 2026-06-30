import express from "express";
import { isAuthenticated, authorizeRoles } from "../middleware/auth.js";
import {
  getDailyTaxReport,
  getMonthlyTaxReport,
  getTaxReportByRange,
  exportTaxReportExcel,
} from "../controllers/taxReport.controller.js";

const taxReportRouter = express.Router();

// All routes: admin only
taxReportRouter.use(isAuthenticated, authorizeRoles("admin"));

// ── Reports ───────────────────────────────────────────────────────────────────

// GET /reports/taxes/daily?date=2026-06-29
taxReportRouter.get("/daily", getDailyTaxReport);

// GET /reports/taxes/monthly?year=2026&month=6
taxReportRouter.get("/monthly", getMonthlyTaxReport);

// GET /reports/taxes/range?dateFrom=2026-06-01&dateTo=2026-06-29
taxReportRouter.get("/range", getTaxReportByRange);

// GET /reports/taxes/export?date=2026-06-29
// GET /reports/taxes/export?year=2026&month=6
// GET /reports/taxes/export?dateFrom=2026-06-01&dateTo=2026-06-29
taxReportRouter.get("/export", exportTaxReportExcel);

export default taxReportRouter;