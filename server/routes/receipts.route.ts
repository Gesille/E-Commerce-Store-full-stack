import express from "express";

import { authorizeRoles, isAuthenticated } from "../middleware/auth.js";

import {
  debugPosReports,
  getReceiptById,
  getReceipts,
  printOdooReceipt,
  sendReceiptByEmail,
} from "../controllers/receipts.controller.js";

const receiptRouter = express.Router();

// ─────────────────────────────────────────────────────────

receiptRouter.get(
  "/get-receipts-for-admin-and-cashier",
  isAuthenticated,
  authorizeRoles("admin", "cashier"),
  getReceipts,
);

// ─────────────────────────────────────────────────────────

receiptRouter.get(
  "/get-receipt/:receiptId",
  isAuthenticated,
  authorizeRoles("admin", "cashier"),
  getReceiptById,
);

receiptRouter.post(
  "/receipts/:receiptId/send-email",
  isAuthenticated,
  authorizeRoles("admin", "cashier"),
  sendReceiptByEmail,
);
receiptRouter.get(
  "/print/:orderId",
  isAuthenticated,
  authorizeRoles("admin", "cashier"),
  printOdooReceipt,
);
receiptRouter.get("/debugPosReports", isAuthenticated, debugPosReports);
export default receiptRouter;
