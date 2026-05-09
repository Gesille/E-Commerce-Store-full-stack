import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "./catchAsyncError.js";
import jwt, { JwtPayload } from "jsonwebtoken";
import { updateAccessToken } from "../controllers/user.controller.js";
import ErrorHandler from "../utils/ErrorHandler.js";
import userModel from "../models/user.model.js";


export const isAuthenticated = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    
    // ← يقرأ من header أو cookie
    const authHeader = req.headers.authorization;
  
    const access_token = authHeader?.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : req.cookies.access_token as string;

    if (!access_token) {
      return next(new ErrorHandler("Please login to access this resource", 401));
    }
console.log(req.cookies);
    try {
      const decoded = jwt.verify(
        access_token,
        process.env.ACCESS_TOKEN as string
      ) as JwtPayload;

      const user = await userModel.findById(decoded.id);
      if (!user) return next(new ErrorHandler("User not found", 404));

      req.user = user;
      next();
    } catch (error: any) {
      if (error.name === "TokenExpiredError") {
        return updateAccessToken(req, res, next);
      }
      return next(new ErrorHandler("Invalid access token", 401));
    }
  }
);

export const authorizeRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user?.role) {
      return next(new ErrorHandler("User role is not defined", 400));
    }
    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorHandler(
          `Role: ${req.user.role} is not allowed to access this resource`,
          403
        )
      );
    }
    next();
  };
};