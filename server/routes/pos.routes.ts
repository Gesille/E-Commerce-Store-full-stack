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

POSRouter.post("/session/open", authorizeRoles("admin"), openSession);
POSRouter.post("/session/close", authorizeRoles("admin"), closeSession);
POSRouter.get("/session/active", getActiveSession);
POSRouter.post(
  "/session/switch-cashier",
  authorizeRoles("admin"),
  switchCashier,
);

POSRouter.post("/order", createOrder);

export default POSRouter;
