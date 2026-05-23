import { Request, Response, NextFunction } from "express";

import {
  getReceiptsService,
  getReceiptByIdService,
} from "../services/receipts.service.js";

// ─────────────────────────────────────────────────────────
// GET /receipts
// ─────────────────────────────────────────────────────────

export const getReceipts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page, limit, search, dateFrom, dateTo, state } = req.query;

    const result = await getReceiptsService({
      page: Number(page) || 1,
      limit: Number(limit) || 20,
      search: String(search || ""),
      dateFrom: dateFrom as string | undefined,
      dateTo: dateTo as string | undefined,
      state: state as any,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────
// GET /receipts/:receiptId
// ─────────────────────────────────────────────────────────

export const getReceiptById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const receiptId = Number(req.params.receiptId);

    if (!receiptId || isNaN(receiptId)) {
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
  } catch (error: any) {
    if (error?.message === "Receipt not found") {
      return res.status(404).json({
        success: false,
        message: "Receipt not found",
      });
    }
    next(error);
  }
};


