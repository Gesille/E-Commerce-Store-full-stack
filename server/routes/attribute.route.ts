import { getAttributeOptions } from "../controllers/attributeController.js";
import express from "express";
const attributeRouter = express.Router();


attributeRouter.get("/attributes/:type", getAttributeOptions);

export default attributeRouter