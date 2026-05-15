import { Router } from "express";

import { isAuthenticated } from "../middleware/auth.js";
import { createOrder } from "../controllers/order.controller.js";
import {
  getPOSConfigs,
  getPaymentMethods,
  getActiveSession,
  openSession,
  closeSession,
  switchCashier,
  getProducts,
  getCustomers,
  createCustomer,
  getSessionOrders,
} from "../controllers/posSession.controller.js";

const router = Router();

// ── Configs & Setup ──────────────────────────────────────────────
router.get("/configs", isAuthenticated, getPOSConfigs);
router.get("/payment-methods", isAuthenticated, getPaymentMethods);

// ── Sessions ─────────────────────────────────────────────────────
router.get("/session/active", isAuthenticated, getActiveSession);
router.post("/session/open", isAuthenticated, openSession);
router.post("/session/close", isAuthenticated, closeSession);
router.post("/session/switch-cashier", isAuthenticated, switchCashier);

// ── Products & Customers ─────────────────────────────────────────
router.get("/products", isAuthenticated, getProducts);
router.get("/customers", isAuthenticated, getCustomers);
router.post("/customers", isAuthenticated, createCustomer);

// ── Orders ───────────────────────────────────────────────────────
router.post("/order", isAuthenticated, createOrder);
router.get("/orders/:sessionId", isAuthenticated, getSessionOrders);

export default router;
