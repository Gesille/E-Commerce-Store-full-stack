import express from "express";
import {
  getSuppliers,
  getProductsForPO,
  createPurchaseOrder,
  confirmPurchaseOrder,
  receivePurchaseOrder,
  getPurchaseOrders,
  createSupplier,
} from "../controllers/purchase.controller.js";
import { authorizeRoles, isAuthenticated } from "../middleware/auth.js";

const PurchaseRouter = express.Router();

PurchaseRouter.get("/purchase-orders",isAuthenticated,authorizeRoles("admin"), getPurchaseOrders);
PurchaseRouter.get("/purchase-orders/suppliers", isAuthenticated,authorizeRoles("admin"),getSuppliers);
PurchaseRouter.get("/purchase-orders/products", isAuthenticated,authorizeRoles("admin"),getProductsForPO);
PurchaseRouter.post("/purchase-orders",isAuthenticated,authorizeRoles("admin"), createPurchaseOrder);
PurchaseRouter.post("/purchase-orders/confirm/:id", isAuthenticated,authorizeRoles("admin"),confirmPurchaseOrder);
PurchaseRouter.post("/purchase-orders/receive/:pickingId",isAuthenticated,authorizeRoles("admin"), receivePurchaseOrder);
PurchaseRouter.post("/purchase-orders/suppliers", isAuthenticated,authorizeRoles("admin"),createSupplier);

export default PurchaseRouter;