import { Request, Response, NextFunction } from "express";

import {
  getReceiptsService,
  getReceiptByIdService,
} from "../services/receipts.service.js";

// ─────────────────────────────────────────────────────────

export const getReceipts = async (
  req:Request,
  res:Response
) => {

  console.log("ROUTE HIT");

  return res.status(200).json({
    success: true,
    message: "Route works"
  });
};

// ─────────────────────────────────────────────────────────

export const getReceiptById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const receiptId = Number(req.params.receiptId);

    if (!receiptId) {
      return res.status(400).json({
        success: false,
        message: "Invalid receipt id",
      });
    }

    const receipt = await getReceiptByIdService(receiptId);

    return res.status(200).json({
      success: true,
      receipt,
    });
  } catch (error) {
    next(error);
  }
};