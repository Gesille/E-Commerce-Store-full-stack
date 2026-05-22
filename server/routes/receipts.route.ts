import express from "express";

import { authorizeRoles, isAuthenticated } from "../middleware/auth.js";


import { getReceiptById, getReceipts } from "../controllers/receipts.controller.js";



const receiptRouter = express.Router();


receiptRouter.get(
  "/get-all-receipts",
  isAuthenticated,
 authorizeRoles("admin", "cashier"),
  getReceipts
);



receiptRouter.get(
  "/get-receipt/:receiptId",
  isAuthenticated,
  authorizeRoles("admin", "cashier"),
  getReceiptById
);


export default receiptRouter;