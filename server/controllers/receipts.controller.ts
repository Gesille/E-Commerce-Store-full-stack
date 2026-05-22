import { Request, Response, NextFunction } from "express";

import {
  getReceiptsService,
  getReceiptByIdService,
} from "../services/receipts.service.js";

// ─────────────────────────────────────────────────────────

import { odooRequest } from "../odoo/odoo.client.js";

export const getReceipts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {

  try {

    console.log("START");

    const test = await odooRequest(
      "pos.order",
      "search_read",
      [[]],
      {
        fields: ["id", "name"],
        limit: 1,
      }
    );

    console.log("ODOO OK");

    return res.status(200).json({
      success: true,
      test,
    });

  } catch (error:any) {

    console.log(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
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