// routes/contact.route.ts
import express from "express";
import { deleteMessage, getAllMessages, markAsRead, sendContactMessage } from "../controllers/contact.controller.js";
import { isAbsolute } from "path";
import { authorizeRoles, isAuthenticated } from "../middleware/auth.js";

const contactRouter  = express.Router();


contactRouter.post("/contact",sendContactMessage);

contactRouter.get("/get-messages", isAuthenticated, authorizeRoles("admin"), getAllMessages);
contactRouter.put("/mark-read/:id", isAuthenticated, authorizeRoles("admin"), markAsRead);
contactRouter.delete("/delete-message/:id", isAuthenticated, authorizeRoles("admin"), deleteMessage);

export default contactRouter ;