import { Router } from "express";

import { isAuthenticated, authorizeRoles } from "../middleware/auth.js";
import { createOrder } from "../controllers/order.controller.js";
import {
  openSession,
  closeSession,
  getActiveSession,
  startCashierShift,
  pauseCashierShift,
  resumeCashierShift,
  endCashierShift,
  getActiveShifts,
  getSessionOrders,
  getSessionReport,
  getProducts,
  getCustomers,
  createCustomer,
  getPaymentMethods,
  getPOSConfigs,
  confirmOpeningBalance,
} from "../controllers/posSession.controller.js";

const POSRouter = Router();

POSRouter.post(
  "/session/open",
  isAuthenticated,
  authorizeRoles("admin","cashier"),
  openSession,
);

POSRouter.post(
  "/session/close",
  isAuthenticated,
  authorizeRoles("admin","cashier"),
  closeSession,
);
POSRouter.post(
  "/session/confirm-opening",
  isAuthenticated,
  authorizeRoles("admin", "cashier"),
  confirmOpeningBalance,
);
POSRouter.get(
  "/session/active",
  isAuthenticated,
  authorizeRoles("admin", "cashier"),
  getActiveSession,
);

POSRouter.post(
  "/shift/start",
  isAuthenticated,
  authorizeRoles("admin", "cashier"),
  startCashierShift,
);

POSRouter.post(
  "/shift/pause",
  isAuthenticated,
  authorizeRoles("admin", "cashier"),
  pauseCashierShift,
);

POSRouter.post(
  "/shift/resume",
  isAuthenticated,
  authorizeRoles("admin", "cashier"),
  resumeCashierShift,
);

POSRouter.post(
  "/shift/end",
  isAuthenticated,
  authorizeRoles("admin", "cashier"),
  endCashierShift,
);

POSRouter.get(
  "/shift/active",
  isAuthenticated,
  authorizeRoles("admin", "cashier"),
  getActiveShifts,
);

POSRouter.post(
  "/order",
  isAuthenticated,
  authorizeRoles("admin", "cashier"),
  createOrder,
);

POSRouter.get(
  "/orders/:sessionId",
  isAuthenticated,
  authorizeRoles("admin", "cashier"),
  getSessionOrders,
);

POSRouter.get(
  "/session/:sessionId/report",
  isAuthenticated,
  authorizeRoles("admin"),
  getSessionReport,
);

POSRouter.get("/products", isAuthenticated, getProducts);
POSRouter.get("/get-customers", isAuthenticated, getCustomers);
POSRouter.post(
  "/customers",
  isAuthenticated,
  authorizeRoles("admin", "cashier"),
  createCustomer,
);
POSRouter.get("/payment-methods", isAuthenticated, getPaymentMethods);
POSRouter.get(
  "/configs",
  isAuthenticated,
  authorizeRoles("admin"),
  getPOSConfigs,
);

export default POSRouter;
