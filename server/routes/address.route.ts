import express from "express";

import { isAuthenticated } from "../middleware/auth.js";
import { createAddress, deleteAddress, getAddress, updateAddress } from "../controllers/address.controller.js";
import { updateAccessToken } from "../controllers/user.controller.js";


const addressRouter = express.Router();

addressRouter.post("/create-address", updateAccessToken,isAuthenticated,createAddress);

addressRouter.get("/get-all-address",updateAccessToken,isAuthenticated,getAddress)

addressRouter.patch("/update-address/:addressId",updateAccessToken,isAuthenticated,updateAddress)

addressRouter.delete("/delete-address/:addressId",updateAccessToken,isAuthenticated,deleteAddress)



export default addressRouter;