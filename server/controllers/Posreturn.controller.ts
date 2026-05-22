import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncError.js";
import ErrorHandler from "../utils/ErrorHandler.js";
import { odooRequest } from "../odoo/odoo.client.js";
import Return from "../models/Return.model.js";


const TAX_RATE = 0.1;


interface ReturnItem {
  productId: number;
  name: string;
  sku?: string;
  unitPrice: number;
  taxRate?: number;
  qtyReturned: number;
}


function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function computeItemTotals(item: ReturnItem) {
  const rate = item.taxRate ?? TAX_RATE;
  const refundSubtotal = round2(item.unitPrice * item.qtyReturned);
  const refundTax = round2(refundSubtotal * rate);
  const refundTotal = round2(refundSubtotal + refundTax);
  return { ...item, taxRate: rate, refundSubtotal, refundTax, refundTotal };
}

export const getReturns = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;
    const dateFrom = req.query.date_from as string | undefined;
    const dateTo = req.query.date_to as string | undefined;

    const query: Record<string, any> = {};

    if (status) query.status = status;

    if (search) {
      query.$or = [
        { returnNumber: { $regex: search, $options: "i" } },
        { receiptNumber: { $regex: search, $options: "i" } },
        { cashier: { $regex: search, $options: "i" } },
      ];
    }

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(`${dateFrom}T00:00:00.000Z`);
      if (dateTo) query.createdAt.$lte = new Date(`${dateTo}T23:59:59.999Z`);
    }

    const skip = (page - 1) * limit;
    const total = await Return.countDocuments(query);

    const returns = await Return.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();


    const statsAgg = await Return.aggregate([
      { $match: { status: { $ne: "voided" } } },
      {
        $group: {
          _id: null,
          totalRefunded: { $sum: "$total" },
          totalReturns: { $sum: 1 },
          totalItems: { $sum: { $size: "$items" } },
        },
      },
    ]);

    const stats = statsAgg[0] ?? {
      totalRefunded: 0,
      totalReturns: 0,
      totalItems: 0,
    };

    res.status(200).json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      stats: {
        totalRefunded: stats.totalRefunded,
        totalReturns: stats.totalReturns,
        totalItems: stats.totalItems,
      },
      returns,
    });
  },
);


export const getReturnById = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const returnDoc = await Return.findById(id).lean();

    if (!returnDoc) {
      return next(new ErrorHandler("Return not found", 404));
    }

    res.status(200).json({ success: true, return: returnDoc });
  },
);


export const lookupReceipt = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const receiptNumber = (req.query.receiptNumber as string)?.trim();

    if (!receiptNumber) {
      return next(new ErrorHandler("receiptNumber query param is required", 400));
    }

    
    const orders = await odooRequest(
      "pos.order",
      "search_read",
      [
        [
          "|",
          ["pos_reference", "ilike", receiptNumber],
          ["name", "ilike", receiptNumber],
        ],
      ],
      {
        fields: [
          "id",
          "name",
          "date_order",
          "state",
          "amount_total",
          "amount_tax",
          "lines",
          "session_id",
          "user_id",
          "payment_ids",
        ],
        limit: 1,
      },
    );

    if (!orders?.length) {
      return next(new ErrorHandler("Receipt not found", 404));
    }

    const order = orders[0];

    if (order.state !== "paid" && order.state !== "invoiced" && order.state !== "done") {
      return next(
        new ErrorHandler(
          `Order is not paid (current state: ${order.state})`,
          400,
        ),
      );
    }

    const lines = order.lines?.length
      ? await odooRequest(
          "pos.order.line",
          "search_read",
          [[["id", "in", order.lines]]],
          {
            fields: [
              "id",
              "product_id",
              "qty",
              "price_unit",
              "price_subtotal_incl",
              "discount",
            ],
          },
        )
      : [];


    const payments = order.payment_ids?.length
      ? await odooRequest(
          "pos.payment",
          "search_read",
          [[["id", "in", order.payment_ids]]],
          { fields: ["payment_method_id", "amount"] },
        )
      : [];


    const receipt = {
      odooOrderId: order.id,
      receiptNumber: order.name,
      date: order.date_order,
      cashier: order.user_id?.[1] ?? "Unknown",
      session: order.session_id?.[1] ?? "—",
      paymentMethod: payments[0]?.payment_method_id?.[1] ?? "Cash",
      originalTotal: order.amount_total,
      items: lines.map((l: any) => ({
        productId: l.product_id?.[0],
        name: l.product_id?.[1] ?? "—",
        sku: "",
        unitPrice: l.price_unit,
        taxRate: TAX_RATE,
        qty: l.qty,
        discount: l.discount ?? 0,
        subtotal: l.price_subtotal_incl,
      })),
    };

    res.status(200).json({ success: true, receipt });
  },
);

export const createReturn = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const {
      receiptNumber,
      odooOrderId,
      cashier,
      cashierId,
      reason,
      items,
      paymentMethod,
      notes,
    }: {
      receiptNumber: string;
      odooOrderId?: number;
      cashier: string;
      cashierId?: string;
      reason: string;
      items: ReturnItem[];
      paymentMethod: string;
      notes?: string;
    } = req.body;

 

    if (!receiptNumber) {
      return next(new ErrorHandler("receiptNumber is required", 400));
    }
    if (!cashier) {
      return next(new ErrorHandler("cashier is required", 400));
    }
    if (!reason) {
      return next(new ErrorHandler("reason is required", 400));
    }
    if (!items?.length) {
      return next(new ErrorHandler("At least one item is required", 400));
    }
    if (!paymentMethod) {
      return next(new ErrorHandler("paymentMethod is required", 400));
    }


    const processedItems = items.map(computeItemTotals);

    const subtotal = round2(
      processedItems.reduce((s, i) => s + i.refundSubtotal, 0),
    );
    const taxTotal = round2(
      processedItems.reduce((s, i) => s + i.refundTax, 0),
    );
    const total = round2(subtotal + taxTotal);


    const returnDoc = await Return.create({
      receiptNumber,
      odooOrderId,
      cashier,
      cashierId,
      reason,
      items: processedItems,
      subtotal,
      taxTotal,
      total,
      paymentMethod,
      notes,
      status: "completed",
    });

    res.status(201).json({
      success: true,
      message: "Return processed successfully",
      return: returnDoc,
    });
  },
);


export const voidReturn = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { voidedBy, notes } = req.body;

    const returnDoc = await Return.findById(id);

    if (!returnDoc) {
      return next(new ErrorHandler("Return not found", 404));
    }

    if (returnDoc.status === "voided") {
      return next(new ErrorHandler("Return is already voided", 400));
    }

    returnDoc.status = "voided";
    returnDoc.voidedBy = voidedBy ?? "Unknown";
    returnDoc.voidedAt = new Date();
    if (notes) returnDoc.notes = notes;

    await returnDoc.save();

    res.status(200).json({
      success: true,
      message: "Return voided successfully",
      return: returnDoc,
    });
  },
);


export const getReturnStats = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const dateFrom = req.query.date_from as string | undefined;
    const dateTo = req.query.date_to as string | undefined;

    const match: Record<string, any> = { status: { $ne: "voided" } };

    if (dateFrom || dateTo) {
      match.createdAt = {};
      if (dateFrom) match.createdAt.$gte = new Date(`${dateFrom}T00:00:00.000Z`);
      if (dateTo) match.createdAt.$lte = new Date(`${dateTo}T23:59:59.999Z`);
    }

    const [overall] = await Return.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalRefunded: { $sum: "$total" },
          totalReturns: { $sum: 1 },
          totalItems: { $sum: { $size: "$items" } },
          avgRefund: { $avg: "$total" },
        },
      },
    ]);

    // Top return reasons
    const byReason = await Return.aggregate([
      { $match: match },
      { $group: { _id: "$reason", count: { $sum: 1 }, total: { $sum: "$total" } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    // Daily breakdown (last 30 days)
    const daily = await Return.aggregate([
      {
        $match: {
          ...match,
          createdAt: {
            $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
          total: { $sum: "$total" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalRefunded: overall?.totalRefunded ?? 0,
        totalReturns: overall?.totalReturns ?? 0,
        totalItems: overall?.totalItems ?? 0,
        avgRefund: round2(overall?.avgRefund ?? 0),
        byReason,
        daily,
      },
    });
  },
);