import express from "express";

import { authorizeRoles, isAuthenticated } from "../middleware/auth.js";

import { createOrder, exportInventory, getAdminOrderDetail, getAdminOrders, getInventoryReport, getLatestTransactions, getMonthlyRevenue, getOrderStatusStats, managerCancelOrder, managerConfirmOrder, managerCreateOrder, returnOrderItems, trackOrder} from "../controllers/order.controller.js";


const orderRouter = express.Router();

orderRouter.post("/create-order",isAuthenticated, createOrder);

orderRouter.get("/manager-confirm/:orderId" ,isAuthenticated,authorizeRoles("admin"),managerConfirmOrder);
orderRouter.get("/manager-cancel/:orderId",isAuthenticated,authorizeRoles("admin"), managerCancelOrder);
orderRouter.get("/admin-orders", isAuthenticated, authorizeRoles("admin"), getAdminOrders);

orderRouter.get("/admin-orders/:id", isAuthenticated, authorizeRoles("admin"), getAdminOrderDetail); 
orderRouter.get("/track/:orderId",isAuthenticated,trackOrder)

orderRouter.get("/get-inventory",isAuthenticated,getInventoryReport)

orderRouter.get("/inventory/export", isAuthenticated, authorizeRoles("admin"),exportInventory);
orderRouter.get(
  "/revenue/monthly",
  isAuthenticated,
  authorizeRoles("admin"),
  getMonthlyRevenue
);

orderRouter.get("/dashboard/order-status",isAuthenticated,authorizeRoles("admin"), getOrderStatusStats);
orderRouter.get("/dashboard/latest-transactions", isAuthenticated,authorizeRoles("admin"),getLatestTransactions);
orderRouter.post("/order-return",isAuthenticated,authorizeRoles("admin"),returnOrderItems)
orderRouter.post("/manager-create-order", isAuthenticated, authorizeRoles("admin"), managerCreateOrder);
export default orderRouter;