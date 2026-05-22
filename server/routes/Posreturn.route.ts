import { Router } from "express";
import { isAuthenticated, authorizeRoles } from "../middleware/auth.js";
import {
  createReturn,
  getReturnById,
  getReturns,
  getReturnStats,
  lookupReceipt,
  voidReturn,
} from "../controllers/Posreturn.controller.js";

const ReturnRouter = Router();

ReturnRouter.get(
  "/receipt-lookup",
  isAuthenticated,
  authorizeRoles("admin", "cashier"),
  lookupReceipt,
);

ReturnRouter.get(
  "/returns",
  isAuthenticated,
  authorizeRoles("admin", "cashier"),
  getReturns,
);

ReturnRouter.get(
  "/returns/stats",
  isAuthenticated,
  authorizeRoles("admin", "cashier"),
  getReturnStats,
);

ReturnRouter.get(
  "/returns/:id",
  isAuthenticated,
  authorizeRoles("admin", "cashier"),
  getReturnById,
);

ReturnRouter.post(
  "/returns",
  isAuthenticated,
  authorizeRoles("admin", "cashier"),
  createReturn,
);

ReturnRouter.patch(
  "/returns/:id/void",
  isAuthenticated,
  authorizeRoles("admin", "cashier"),
  voidReturn,
);

export default ReturnRouter;
