import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncError.js";
import ErrorHandler from "../utils/ErrorHandler.js";
import { odooRequest } from "../odoo/odoo.client.js";


const TAX_RATE = 0.1;


function round2(n: number): number {
  return Math.round(n * 100) / 100;
}


export const lookupReceipt = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const receiptNumber = (req.query.receiptNumber as string)?.trim();

    if (!receiptNumber) {
      return next(new ErrorHandler("receiptNumber is required", 400));
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
      }
    );

    if (!orders?.length) {
      return next(new ErrorHandler("Receipt not found", 404));
    }

    const order = orders[0];

    if (
      order.state !== "paid" &&
      order.state !== "invoiced" &&
      order.state !== "done"
    ) {
      return next(
        new ErrorHandler(
          `Order is not paid (current state: ${order.state})`,
          400
        )
      );
    }

    // Check if a return already exists in Odoo for this order
    const existingReturns = await odooRequest(
      "pos.order",
      "search_read",
      [[["return_order_id", "=", order.id]]],
      { fields: ["id", "name"], limit: 1 }
    ).catch(() => []);

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
              "tax_ids",
            ],
          }
        )
      : [];

    const payments = order.payment_ids?.length
      ? await odooRequest(
          "pos.payment",
          "search_read",
          [[["id", "in", order.payment_ids]]],
          { fields: ["payment_method_id", "amount"] }
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
      hasExistingReturn: existingReturns.length > 0,
      items: lines.map((l: any) => ({
        productId: l.product_id?.[0],
        name: l.product_id?.[1] ?? "—",
        sku: String(l.product_id?.[0] ?? ""),
        unitPrice: l.price_unit,
        taxRate: TAX_RATE,
        qty: l.qty,
        discount: l.discount ?? 0,
        subtotal: l.price_subtotal_incl,
        // Keep Odoo line id for return creation
        odooLineId: l.id,
      })),
    };

    res.status(200).json({ success: true, receipt });
  }
);

// ─── Create Return ────────────────────────────────────────────────────────────
// POST /returns
// Creates a return order directly in Odoo using pos.order._create_order or
// the standard Odoo return wizard approach via account.move or pos.order refund

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
      items: {
        productId: number;
        name: string;
        sku?: string;
        unitPrice: number;
        taxRate?: number;
        qtyReturned: number;
        odooLineId?: number;
      }[];
      paymentMethod: string;
      notes?: string;
    } = req.body;

    if (!receiptNumber) {
      return next(new ErrorHandler("Receipt number is required", 400));
    }
    if (!reason) {
      return next(new ErrorHandler("Return reason is required", 400));
    }
    if (!items?.length) {
      return next(new ErrorHandler("At least one item must be specified", 400));
    }

    // 1. Find the original Odoo order
    let orderId = odooOrderId;
    if (!orderId) {
      const orders = await odooRequest(
        "pos.order",
        "search_read",
        [
          [
            "|",
            ["pos_reference", "=", receiptNumber],
            ["name", "=", receiptNumber],
          ],
        ],
        { fields: ["id", "state", "lines", "session_id"], limit: 1 }
      );
      if (!orders?.length) {
        return next(new ErrorHandler("Original order not found in Odoo", 404));
      }
      orderId = orders[0].id;
    }

    // 2. Fetch all lines of the original order
    const originalOrder = await odooRequest(
      "pos.order",
      "read",
      [[orderId]],
      {
        fields: ["lines", "session_id", "state"],
      }
    );

    if (!originalOrder?.length) {
      return next(new ErrorHandler("Failed to read order data from Odoo", 404));
    }

    const sessionId: number = originalOrder[0].session_id?.[0];

    // 3. Fetch original order lines from Odoo
    const originalLines = await odooRequest(
      "pos.order.line",
      "search_read",
      [[["id", "in", originalOrder[0].lines]]],
      {
        fields: ["id", "product_id", "qty", "price_unit", "discount", "tax_ids"],
      }
    );

    // 4. Build return order lines (negative quantities)
    //    Match each return item to its Odoo line
    const returnLines: any[] = [];

    for (const item of items) {
      const odooLine = item.odooLineId
        ? originalLines.find((l: any) => l.id === item.odooLineId)
        : originalLines.find((l: any) => l.product_id?.[0] === item.productId);

      if (!odooLine) {
        return next(
          new ErrorHandler(
            `Product "${item.name}" not found in the original order`,
            400
          )
        );
      }

      // [0, 0, {...}] is Odoo's format for creating new related records
      returnLines.push([
        0,
        0,
        {
          product_id: item.productId,
          qty: -Math.abs(item.qtyReturned),         // negative = return
          price_unit: item.unitPrice,
          discount: odooLine.discount ?? 0,
          tax_ids: odooLine.tax_ids ?? [],
        },
      ]);
    }

    // 5. Create the return order in Odoo
    const returnOrderId = await odooRequest(
      "pos.order",
      "create",
      [
        {
          session_id: sessionId,
          return_order_id: orderId,               // links back to original
          note: `${reason}${notes ? " — " + notes : ""}`,
          lines: returnLines,
          // amount_* are computed by Odoo automatically
        },
      ]
    );

    if (!returnOrderId) {
      return next(new ErrorHandler("Failed to create return order in Odoo", 500));
    }

    // 6. Read back the created return order for the response
    const returnOrders = await odooRequest(
      "pos.order",
      "read",
      [[returnOrderId]],
      {
        fields: [
          "id",
          "name",
          "date_order",
          "amount_total",
          "amount_tax",
          "state",
          "return_order_id",
          "lines",
        ],
      }
    );

    const returnOrder = returnOrders?.[0];

    // 7. Compute totals for response
    const subtotal = round2(
      items.reduce((s, i) => s + i.unitPrice * i.qtyReturned, 0)
    );
    const taxTotal = round2(subtotal * TAX_RATE);
    const total = round2(subtotal + taxTotal);

    res.status(201).json({
      success: true,
      message: "Return processed successfully",
      return: {
        _id: String(returnOrderId),
        returnNumber: returnOrder?.name ?? `RET-${returnOrderId}`,
        receiptNumber,
        odooOrderId: orderId,
        odooReturnOrderId: returnOrderId,
        cashier,
        reason,
        paymentMethod,
        notes,
        subtotal,
        taxTotal,
        total,
        status: "completed",
        items: items.map((item) => ({
          productId: item.productId,
          name: item.name,
          sku: item.sku ?? "",
          unitPrice: item.unitPrice,
          taxRate: item.taxRate ?? TAX_RATE,
          qtyReturned: item.qtyReturned,
          refundSubtotal: round2(item.unitPrice * item.qtyReturned),
          refundTax: round2(item.unitPrice * item.qtyReturned * (item.taxRate ?? TAX_RATE)),
          refundTotal: round2(
            item.unitPrice * item.qtyReturned * (1 + (item.taxRate ?? TAX_RATE))
          ),
        })),
        createdAt: new Date().toISOString(),
      },
    });
  }
);

// ─── Get Returns ──────────────────────────────────────────────────────────────
// GET /returns
// Reads return orders from Odoo (orders with return_order_id set = returns)

export const getReturns = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const search = (req.query.search as string) || "";
    const status = (req.query.status as string) || "";
    const dateFrom = req.query.date_from as string | undefined;
    const dateTo = req.query.date_to as string | undefined;

    // Build Odoo domain — return orders have return_order_id set
    const domain: any[] = [["return_order_id", "!=", false]];

    if (search) {
      domain.push("|");
      domain.push(["name", "ilike", search]);
      domain.push(["return_order_id.name", "ilike", search]);
    }

    if (dateFrom) {
      domain.push(["date_order", ">=", `${dateFrom} 00:00:00`]);
    }
    if (dateTo) {
      domain.push(["date_order", "<=", `${dateTo} 23:59:59`]);
    }

    // Map frontend status to Odoo state
    // voided → cancelled, completed → done/invoiced/paid, pending → draft
    if (status === "completed") {
      domain.push("|");
      domain.push(["state", "=", "done"]);
      domain.push("|");
      domain.push(["state", "=", "paid"]);
      domain.push(["state", "=", "invoiced"]);
    } else if (status === "voided") {
      domain.push(["state", "=", "cancel"]);
    } else if (status === "pending") {
      domain.push(["state", "=", "draft"]);
    }

    // Total count
    const total: number = await odooRequest(
      "pos.order",
      "search_count",
      [domain]
    );

    // Paginated results
    const orders = await odooRequest(
      "pos.order",
      "search_read",
      [domain],
      {
        fields: [
          "id",
          "name",
          "date_order",
          "amount_total",
          "amount_tax",
          "state",
          "return_order_id",
          "user_id",
          "lines",
          "note",
        ],
        limit,
        offset: (page - 1) * limit,
        order: "date_order desc",
      }
    );

    // Fetch lines for all orders in one batch
    const allLineIds = orders.flatMap((o: any) => o.lines ?? []);
    const allLines = allLineIds.length
      ? await odooRequest(
          "pos.order.line",
          "search_read",
          [[["id", "in", allLineIds]]],
          {
            fields: [
              "id",
              "order_id",
              "product_id",
              "qty",
              "price_unit",
              "price_subtotal_incl",
            ],
          }
        )
      : [];

    // Group lines by order id
    const linesByOrder: Record<number, any[]> = {};
    for (const line of allLines) {
      const oid = line.order_id?.[0];
      if (!linesByOrder[oid]) linesByOrder[oid] = [];
      linesByOrder[oid].push(line);
    }

    // Map Odoo state → frontend status
    const mapState = (state: string) => {
      if (state === "cancel") return "voided";
      if (state === "draft") return "pending";
      return "completed";
    };

    const returns = orders.map((o: any) => {
      const lines = linesByOrder[o.id] ?? [];
      const subtotal = round2(
        lines.reduce(
          (s: number, l: any) => s + Math.abs(l.price_unit) * Math.abs(l.qty),
          0
        )
      );
      const taxTotal = round2(subtotal * TAX_RATE);

      return {
        _id: String(o.id),
        returnNumber: o.name,
        receiptNumber: o.return_order_id?.[1] ?? "—",
        cashier: o.user_id?.[1] ?? "unknown",
        reason: o.note ?? "—",
        subtotal,
        taxTotal,
        total: round2(Math.abs(o.amount_total)),
        paymentMethod: "—",
        status: mapState(o.state),
        createdAt: o.date_order,
        updatedAt: o.date_order,
        items: lines.map((l: any) => ({
          name: l.product_id?.[1] ?? "—",
          sku: String(l.product_id?.[0] ?? ""),
          qtyReturned: Math.abs(l.qty),
          refundTotal: round2(Math.abs(l.price_subtotal_incl)),
        })),
      };
    });

    // Stats aggregation from Odoo
    const allReturnOrders = await odooRequest(
      "pos.order",
      "search_read",
      [[["return_order_id", "!=", false], ["state", "!=", "cancel"]]],
      { fields: ["amount_total", "lines"] }
    );

    const totalRefunded = round2(
      allReturnOrders.reduce(
        (s: number, o: any) => s + Math.abs(o.amount_total),
        0
      )
    );
    const totalItems = allReturnOrders.reduce(
      (s: number, o: any) => s + (o.lines?.length ?? 0),
      0
    );

    res.status(200).json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      stats: {
        totalRefunded,
        totalReturns: allReturnOrders.length,
        totalItems,
      },
      returns,
    });
  }
);

// ─── Get Return By ID ─────────────────────────────────────────────────────────
// GET /returns/:id

export const getReturnById = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return next(new ErrorHandler("معرف غير صالح", 400));
    }

    const orders = await odooRequest(
      "pos.order",
      "read",
      [[id]],
      {
        fields: [
          "id",
          "name",
          "date_order",
          "amount_total",
          "amount_tax",
          "state",
          "return_order_id",
          "user_id",
          "lines",
          "note",
        ],
      }
    );

    if (!orders?.length) {
      return next(new ErrorHandler("طلب الإرجاع غير موجود", 404));
    }

    const o = orders[0];

    const lines = o.lines?.length
      ? await odooRequest(
          "pos.order.line",
          "search_read",
          [[["id", "in", o.lines]]],
          {
            fields: [
              "id",
              "product_id",
              "qty",
              "price_unit",
              "price_subtotal_incl",
            ],
          }
        )
      : [];

    const mapState = (state: string) => {
      if (state === "cancel") return "voided";
      if (state === "draft") return "pending";
      return "completed";
    };

    const subtotal = round2(
      lines.reduce(
        (s: number, l: any) => s + Math.abs(l.price_unit) * Math.abs(l.qty),
        0
      )
    );
    const taxTotal = round2(subtotal * TAX_RATE);

    res.status(200).json({
      success: true,
      return: {
        _id: String(o.id),
        returnNumber: o.name,
        receiptNumber: o.return_order_id?.[1] ?? "—",
        cashier: o.user_id?.[1] ?? "unknown",
        reason: o.note ?? "—",
        subtotal,
        taxTotal,
        total: round2(Math.abs(o.amount_total)),
        paymentMethod: "—",
        status: mapState(o.state),
        createdAt: o.date_order,
        updatedAt: o.date_order,
        items: lines.map((l: any) => ({
          productId: l.product_id?.[0],
          name: l.product_id?.[1] ?? "—",
          sku: String(l.product_id?.[0] ?? ""),
          unitPrice: Math.abs(l.price_unit),
          taxRate: TAX_RATE,
          qtyReturned: Math.abs(l.qty),
          refundSubtotal: round2(Math.abs(l.price_unit) * Math.abs(l.qty)),
          refundTax: round2(
            Math.abs(l.price_unit) * Math.abs(l.qty) * TAX_RATE
          ),
          refundTotal: round2(Math.abs(l.price_subtotal_incl)),
        })),
      },
    });
  }
);

// ─── Void Return ──────────────────────────────────────────────────────────────
// PATCH /returns/:id/void
// Cancels the return order in Odoo

export const voidReturn = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const id = Number(req.params.id);
    const { voidedBy, notes } = req.body;

    if (isNaN(id)) {
      return next(new ErrorHandler("Invalid ID", 400));
    }

    // Check it exists and is a return order
    const orders = await odooRequest(
      "pos.order",
      "read",
      [[id]],
      { fields: ["id", "name", "state", "return_order_id"] }
    );

    if (!orders?.length) {
      return next(new ErrorHandler("Return order not found", 404));
    }

    const order = orders[0];

    if (!order.return_order_id) {
      return next(new ErrorHandler("This order is not a return order", 400));
    }

    if (order.state === "cancel") {
      return next(new ErrorHandler("Return order is already canceled", 400));
    }

    // Cancel in Odoo
    await odooRequest("pos.order", "action_pos_order_cancel", [[id]]).catch(
      async () => {
        // Fallback: write state directly if method not available
        await odooRequest("pos.order", "write", [
          [id],
          {
            state: "cancel",
            note: `${order.note ?? ""} | Canceled by: ${voidedBy ?? "unknown"}${notes ? " — " + notes : ""}`,
          },
        ]);
      }
    );

    res.status(200).json({
      success: true,
      message: "Return canceled successfully",
      return: {
        _id: String(id),
        returnNumber: order.name,
        status: "voided",
        voidedBy: voidedBy ?? "unknown",
        voidedAt: new Date().toISOString(),
      },
    });
  }
);

// ─── Get Return Stats ─────────────────────────────────────────────────────────
// GET /returns/stats

export const getReturnStats = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const dateFrom = req.query.date_from as string | undefined;
    const dateTo = req.query.date_to as string | undefined;

    const domain: any[] = [
      ["return_order_id", "!=", false],
      ["state", "!=", "cancel"],
    ];

    if (dateFrom) domain.push(["date_order", ">=", `${dateFrom} 00:00:00`]);
    if (dateTo) domain.push(["date_order", "<=", `${dateTo} 23:59:59`]);

    const orders = await odooRequest(
      "pos.order",
      "search_read",
      [domain],
      {
        fields: ["id", "amount_total", "amount_tax", "lines", "note", "date_order"],
      }
    );

    // Totals
    const totalRefunded = round2(
      orders.reduce((s: number, o: any) => s + Math.abs(o.amount_total), 0)
    );
    const totalReturns = orders.length;
    const totalItems = orders.reduce(
      (s: number, o: any) => s + (o.lines?.length ?? 0),
      0
    );
    const avgRefund =
      totalReturns > 0 ? round2(totalRefunded / totalReturns) : 0;

    // By reason (note field)
    const reasonMap: Record<string, { count: number; total: number }> = {};
    for (const o of orders) {
      const r = o.note || "unknown";
      if (!reasonMap[r]) reasonMap[r] = { count: 0, total: 0 };
      reasonMap[r].count += 1;
      reasonMap[r].total = round2(
        reasonMap[r].total + Math.abs(o.amount_total)
      );
    }
    const byReason = Object.entries(reasonMap)
      .map(([_id, v]) => ({ _id, ...v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Daily breakdown
    const dailyMap: Record<string, { count: number; total: number }> = {};
    for (const o of orders) {
      const day = o.date_order?.slice(0, 10) ?? "unknown";
      if (!dailyMap[day]) dailyMap[day] = { count: 0, total: 0 };
      dailyMap[day].count += 1;
      dailyMap[day].total = round2(
        dailyMap[day].total + Math.abs(o.amount_total)
      );
    }
    const daily = Object.entries(dailyMap)
      .map(([_id, v]) => ({ _id, ...v }))
      .sort((a, b) => a._id.localeCompare(b._id));

    res.status(200).json({
      success: true,
      stats: {
        totalRefunded,
        totalReturns,
        totalItems,
        avgRefund,
        byReason,
        daily,
      },
    });
  }
);