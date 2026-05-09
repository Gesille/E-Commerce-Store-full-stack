import express from 'express';
import { createProduct, deleteProduct, getAllProductsFromOdoo, getLowStockAlerts, getProductByIdFromOdoo, getPurchasedProducts, getTopSellingProducts, testOdooConnection, updateProduct } from '../controllers/product.controller.js';
import { authorizeRoles, isAuthenticated } from '../middleware/auth.js';


const productRouter = express.Router();

productRouter.get('/test',testOdooConnection)

productRouter.get('/get-all-product',getAllProductsFromOdoo)

productRouter.get('/get-product/:id',getProductByIdFromOdoo)

productRouter.post("/create-product",isAuthenticated,authorizeRoles("admin"),createProduct)


productRouter.delete("/delete-product/:id", isAuthenticated, authorizeRoles("admin"), deleteProduct);
productRouter.post("/update-product/:id", isAuthenticated, authorizeRoles("admin"), updateProduct);

productRouter.get("/purchased-products", isAuthenticated, getPurchasedProducts);
productRouter.get(
  "/dashboard/top-products",
  isAuthenticated,
  authorizeRoles("admin"),
  getTopSellingProducts
);

// in productRouter
productRouter.get(
  "/low-stock",
  isAuthenticated,
  authorizeRoles("admin"),
  getLowStockAlerts
);
export default productRouter;