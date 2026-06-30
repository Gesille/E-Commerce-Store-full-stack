import express from "express";
import { authorizeRoles, isAuthenticated } from "../middleware/auth.js";
import {
  getHolidays,
  createHoliday,
  updateHoliday,
  deleteHoliday,
  getExemptCustomers,
  setCustomerExemption,
  getTaxStatus,
  clearTaxCacheEndpoint,
  getEffectiveTaxRate,
} from "../controllers/taxSettings.controller.js";

const taxSettingsRouter = express.Router();

taxSettingsRouter.use(isAuthenticated, authorizeRoles("admin"));

// ── Diagnostics ──────────────────────────────────────────────────────────────
taxSettingsRouter.get("/status", getTaxStatus);
taxSettingsRouter.post("/clear-cache", clearTaxCacheEndpoint);

// ── Tax Holidays ─────────────────────────────────────────────────────────────
taxSettingsRouter.get("/holidays", getHolidays);
taxSettingsRouter.post("/holidays", createHoliday);
taxSettingsRouter.patch("/holidays/:id", updateHoliday);
taxSettingsRouter.delete("/holidays/:id", deleteHoliday);

// ── Customer Exemptions ───────────────────────────────────────────────────────
taxSettingsRouter.get("/exempt-customers", getExemptCustomers);
taxSettingsRouter.patch(
  "/exempt-customers/:odooPartnerId",
  setCustomerExemption,
);
taxSettingsRouter.get(
  "/effective-rate",
  getEffectiveTaxRate,
);
export default taxSettingsRouter;
