import express from "express";
import {
  getSuppliers,
  getProductsForPO,
  createPurchaseOrder,
  confirmPurchaseOrder,
  receivePurchaseOrder,
  getPurchaseOrders,
} from "../controllers/purchase.controller.js";

const PurchaseRouter = express.Router();

PurchaseRouter.get("/purchase-orders", getPurchaseOrders);
PurchaseRouter.get("/purchase-orders/suppliers", getSuppliers);
PurchaseRouter.get("/purchase-orders/products", getProductsForPO);
PurchaseRouter.post("/purchase-orders", createPurchaseOrder);
PurchaseRouter.post("/purchase-orders/confirm/:id", confirmPurchaseOrder);
PurchaseRouter.post("/purchase-orders/receive/:pickingId", receivePurchaseOrder);

export default PurchaseRouter;