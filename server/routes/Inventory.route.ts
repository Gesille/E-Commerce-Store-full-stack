import { Router } from "express";
import { isAuthenticated, authorizeRoles } from "../middleware/auth.js";
import {
  getInventory,
  getInventorySummary,
  getInventoryMovements,
  getProductMovements,
} from "../controllers/Inventorycontroller.js";

const inventoryRouter = Router();

// NOTE: /summary and /movements must be declared BEFORE /product/:productId/movements
// so Express doesn't try to match "summary" or "movements" as a :productId param.

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

// GET /api/pos/inventory/product/:productId/movements?range=day|week|month
inventoryRouter.get(
  "/inventory/product/:productId/movements",
  isAuthenticated,
  authorizeRoles("admin", "cashier"),
  getProductMovements
);

// GET /api/pos/inventory?range=day|week|month
// Declared last so it doesn't shadow the routes above
inventoryRouter.get(
  "/inventory",
  isAuthenticated,
  authorizeRoles("admin", "cashier"),
  getInventory
);

export default inventoryRouter;