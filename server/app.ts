import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { rateLimit } from "express-rate-limit";

dotenv.config();

import userRouter from "./routes/user.route.js";
import productRouter from "./routes/product.route.js";
import orderRouter from "./routes/order.route.js";
import addressRouter from "./routes/address.route.js";

import { ErrorMiddleware } from "./middleware/error.js";
import categoryRouter from "./routes/categories.route.js";
import contactRouter from "./routes/contact.route.js";
import reportRouter from "./routes/reportRoutes.js";
import POSRouter from "./routes/pos.routes.js";

import AnalyticsRouter from "./routes/analytics.routes.js";
import receiptRouter from "./routes/receipts.route.js";
import ReturnRouter from "./routes/Posreturn.route.js";




export const app = express();


// body parser
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// cookies
app.use(cookieParser());

// cors
app.use(
  cors({
    origin: [
     "https://e-commerce-store-full-stack-oear.vercel.app",
      "https://e-commerce-store-full-stack.vercel.app",
      "https://e-commerce-store-frontend-ten.vercel.app",
      "https://e-commerce-store-full-stack-duuo.vercel.app"
    ],
    credentials: true,
  })
);

// rate limit
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
});
app.use(limiter);
app.set("trust proxy", 1);
// ======================
// ROUTES
// ======================

app.use("/api/v1", userRouter);
app.use("/api/v1", productRouter);
app.use("/api/v1", orderRouter);
app.use("/api/v1", addressRouter);
app.use("/api/v1",categoryRouter);
app.use("/api/v1",contactRouter);
app.use("/api/v1",reportRouter);
app.use("/api/v1",POSRouter)
app.use("/api/v1",AnalyticsRouter);
app.use("/api/v1", receiptRouter);
app.use("/api/v1", ReturnRouter);

// test route
app.get("/test", (req: Request, res: Response) => {
  res.json({
    success: true,
    message: "API is working!",
  });
});


app.all("*path", (req, res, next) => {
  const err = new Error(`Route ${req.originalUrl} not found`) as any;
  err.statusCode = 404;
  next(err);
});


app.use(ErrorMiddleware);

