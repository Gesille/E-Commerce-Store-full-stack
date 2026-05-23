import { Router } from "express";
import { isAuthenticated, authorizeRoles } from "../middleware/auth.js";
import {
  getInventory,
  getInventorySummary,
  getInventoryMovements,
  getProductMovements,
} from "../controllers/Inventorycontroller.js";

const inventoryRouter = Router();

// GET /inventory?range=day|week|month
inventoryRouter.get(
  "/inventory",
  isAuthenticated,
  authorizeRoles("admin", "cashier"),
  getInventory
);

// GET /inventory/summary
inventoryRouter.get(
  "/inventory/summary",
  isAuthenticated,
  authorizeRoles("admin", "cashier"),
  getInventorySummary
);

// GET /inventory/movements?range=day|week|month&limit=50
inventoryRouter.get(
  "/inventory/movements",
  isAuthenticated,
  authorizeRoles("admin", "cashier"),
  getInventoryMovements
);

// GET /inventory/product/:productId/movements?range=day|week|month
inventoryRouter.get(
  "/inventory/product/:productId/movements",
  isAuthenticated,
  authorizeRoles("admin", "cashier"),
  getProductMovements
);

export default inventoryRouter;