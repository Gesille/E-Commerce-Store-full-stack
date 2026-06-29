import express from 'express';

import { createCategory, deleteCategory, getCategories, getCategoryById, updateCategory } from '../controllers/categories.controller.js';
import { refreshTokenMiddleware } from '../controllers/user.controller.js';
import { authorizeRoles, isAuthenticated } from '../middleware/auth.js';



const categoryRouter = express.Router();

categoryRouter.post("/create-category",refreshTokenMiddleware,authorizeRoles("admin"),isAuthenticated,createCategory);

categoryRouter.get("/getcategories",refreshTokenMiddleware,isAuthenticated,getCategories)

categoryRouter.put("/update-category/:id",refreshTokenMiddleware,isAuthenticated,authorizeRoles("admin"),updateCategory)

categoryRouter.delete("/delete-category/:id",isAuthenticated,authorizeRoles("admin"),deleteCategory)

categoryRouter.get("/categories/:id",isAuthenticated, getCategoryById);

export default categoryRouter;