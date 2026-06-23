import express from "express";
import { getDailyClosingReport, getMonthlyCalendarReport, submitCashCount } from "../controllers/posClosingReport_controller.js";


const POSReportRouter = express.Router();

// Daily Z Report
POSReportRouter.get(
  "/reports-daily",
  getDailyClosingReport
);

// Cash count submit
POSReportRouter.post(
  "/daily-cash-count",
  submitCashCount
);

// Monthly calendar report
POSReportRouter.get(
  "/reports-monthly",
  getMonthlyCalendarReport
);

export default POSReportRouter;