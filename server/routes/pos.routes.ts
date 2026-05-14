import { Router } from "express";
import { createOrder } from "../controllers/order.controller.js";
import {
  openSession,
  closeSession,
  getActiveSession,
  switchCashier,
} from "../controllers/posSession.controller.js";
import { isAuthenticated, authorizeRoles } from "../middleware/auth.js";

const POSRouter = Router();

POSRouter.use(isAuthenticated);

POSRouter.post("/open-session", authorizeRoles("admin"), openSession);
POSRouter.post("/close-session", authorizeRoles("admin"), closeSession);
POSRouter.get("/active-session", getActiveSession);
POSRouter.post(
  "/switch-cashier",
  authorizeRoles("admin"),
  switchCashier,
);

POSRouter.post("/session-order", createOrder);

export default POSRouter;
