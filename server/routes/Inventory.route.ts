import { Router } from "express";
import { isAuthenticated, authorizeRoles } from "../middleware/auth.js";
import {
  getInventory,
  getInventorySummary,
  getInventoryMovements,
  getProductMovements,
} from "../controllers/Inventorycontroller.js";

const inventoryRouter = Router();

// GET /api/pos/inventory?range=day|week|month
inventoryRouter.get(
  "/inventory",
  isAuthenticated,
  authorizeRoles("admin", "cashier"),
  getInventory
);

// GET /api/pos/inventory/summary
inventoryRouter.get(
  "/inventory/summary",
  isAuthenticated,
  authorizeRoles("admin", "cashier"),
  getInventorySummary
);

// GET /api/pos/inventory/movements?range=day|week|month&limit=50
inventoryRouter.get(
  "/inventory/movements",
  isAuthenticated,
  authorizeRoles("admin", "cashier"),
  getInventoryMovements
);

// GET /api/pos/inventory/product/:productId/movements
inventoryRouter.get(
  "/inventory/product/:productId/movements",
  isAuthenticated,
  authorizeRoles("admin", "cashier"),
  getProductMovements
);

export default inventoryRouter;