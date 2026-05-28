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

    // 1. Verify order exists
    const orders = await odooRequest(
      "pos.order",
      "search_read",
      [[["id", "=", orderId]]],
      { fields: ["id", "name", "state"], limit: 1 },
    );

    if (!orders?.length) {
      return next(new ErrorHandler("Order not found in Odoo", 404));
    }

    // 2. Find the report action ID for POS receipts
    const reportActions = await odooRequest(
      "ir.actions.report",
      "search_read",
      [[["report_name", "=", "point_of_sale.report_pos_order"]]],
      { fields: ["id", "report_name", "report_type"], limit: 1 },
    );

    if (!reportActions?.length) {
      return next(new ErrorHandler("POS report action not found in Odoo", 404));
    }

    const reportId = reportActions[0].id;

    // 3. Call render_qweb_pdf with correct positional args:
    //    arg[0] = report record id (integer), arg[1] = list of document ids
    const result = await odooRequest(
      "ir.actions.report",
      "render_qweb_pdf",
      [reportId, [orderId]],   // <-- NOT nested in an extra array
      {},
    );

    if (!result) {
      return next(new ErrorHandler("Odoo returned empty PDF", 502));
    }

    // result is [b64_string, 'pdf']
    const pdfBase64 = Array.isArray(result) ? result[0] : result;
    const pdfBuffer = Buffer.from(pdfBase64, "base64");

    // 4. Stream back to frontend
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="receipt-${orderId}.pdf"`,
    );
    res.setHeader("Content-Length", pdfBuffer.length);
    res.send(pdfBuffer);
  },
);


// DEBUG ENDPOINT - add this temporarily to find the correct report name
export const debugPosReports = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const [byModel, byName] = await Promise.all([
      // Search by model
      odooRequest(
        "ir.actions.report",
        "search_read",
        [[["model", "in", ["pos.order", "pos.session", "account.move"]]]],
        { fields: ["id", "report_name", "name", "model", "report_type"], limit: 50 },
      ),
      // Search by common receipt keywords
      odooRequest(
        "ir.actions.report",
        "search_read",
        [[["name", "ilike", "receipt"]]],
        { fields: ["id", "report_name", "name", "model", "report_type"], limit: 20 },
      ),
    ]);

    res.json({ byModel, byName });
  },
);