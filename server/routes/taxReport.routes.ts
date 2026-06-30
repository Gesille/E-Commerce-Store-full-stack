import express from "express";
import { isAuthenticated, authorizeRoles } from "../middleware/auth.js";
import {
  getDailyTaxReport,
  getMonthlyTaxReport,
  getTaxReportByRange,
  exportTaxReportPDF,
} from "../controllers/taxReport.controller.js";

const taxReportRouter = express.Router();


taxReportRouter.use(isAuthenticated, authorizeRoles("admin"));

taxReportRouter.get("/taxes-daily", getDailyTaxReport);

taxReportRouter.get("/taxes-monthly", getMonthlyTaxReport);


taxReportRouter.get("/taxes-range", getTaxReportByRange);


taxReportRouter.get("/export", exportTaxReportPDF);

export default taxReportRouter;