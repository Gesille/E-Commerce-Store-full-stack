import { Request, Response, NextFunction } from "express";

import {
  getReceiptsService,
  getReceiptByIdService,
  sendReceiptByEmailService,
} from "../services/receipts.service.js";
import ErrorHandler from "../utils/ErrorHandler.js";
import { odooRequest } from "../odoo/odoo.client.js";
import { CatchAsyncError } from "../middleware/catchAsyncError.js";

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


export const sendReceiptByEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const orderId = Number(req.params.receiptId);
    const { email } = req.body;

    if (!orderId || isNaN(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order id",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email address",
      });
    }

    await sendReceiptByEmailService(orderId, email);

    return res.status(200).json({
      success: true,
      message: `Receipt sent to ${email}`,
    });
  } catch (error: any) {
    if (error?.message === "Order not found") {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }
    next(error);
  }
};


export const printOdooReceipt = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const orderId = Number(req.params.orderId);
 
    if (!orderId || isNaN(orderId)) {
      return next(new ErrorHandler("Invalid order id", 400));
    }
 
    // 1. Verify the order exists in Odoo
    const orders = await odooRequest(
      "pos.order",
      "search_read",
      [[["id", "=", orderId]]],
      { fields: ["id", "name", "state"], limit: 1 },
    );
 
    if (!orders?.length) {
      return next(new ErrorHandler("Order not found in Odoo", 404));
    }
 
 
    const odooUrl = process.env.ODOO_URL!;
    const odooDb  = process.env.ODOO_DB!;
    const odooUser = process.env.ODOO_USER!;
    const odooPass = process.env.ODOO_PASS!;
 
    // Authenticate to get a session cookie
    const authRes = await fetch(`${odooUrl}/web/session/authenticate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "call",
        params: { db: odooDb, login: odooUser, password: odooPass },
      }),
    });
 
    const setCookie = authRes.headers.get("set-cookie");
    if (!setCookie) {
      return next(new ErrorHandler("Failed to authenticate with Odoo", 502));
    }
 
    // 3. Download the PDF using the session cookie
    const reportUrl = `${odooUrl}/report/pdf/point_of_sale.report_pos_order/${orderId}`;
 
    const pdfRes = await fetch(reportUrl, {
      headers: { Cookie: setCookie },
    });
 
    if (!pdfRes.ok) {
      return next(
        new ErrorHandler(
          `Odoo report failed: ${pdfRes.status} ${pdfRes.statusText}`,
          502,
        ),
      );
    }
 
    const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
 
    // 4. Stream it back to the frontend
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="receipt-${orderId}.pdf"`,
    );
    res.setHeader("Content-Length", pdfBuffer.length);
    res.send(pdfBuffer);
  },
);