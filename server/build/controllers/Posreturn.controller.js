import { CatchAsyncError } from "../middleware/catchAsyncError.js";
import ErrorHandler from "../utils/ErrorHandler.js";
import { odooRequest } from "../odoo/odoo.client.js";
// ─── Constants ────────────────────────────────────────────────────────────────
const TAX_RATE = 0.1;
// ─── Helpers ──────────────────────────────────────────────────────────────────
function round2(n) {
    return Math.round(n * 100) / 100;
}
// pos_reference format: "Return of POS-XXXX | reason — notes"
function extractOriginalReceipt(posRef) {
    if (!posRef)
        return "—";
    const match = posRef.match(/^Return of ([^|]+)/);
    return match ? match[1].trim() : posRef;
}
function extractReason(posRef) {
    if (!posRef)
        return "—";
    const match = posRef.match(/\| (.+)$/);
    return match ? match[1].trim() : "—";
}
function mapState(state) {
    if (state === "cancel")
        return "voided";
    if (state === "draft")
        return "pending";
    return "completed";
}
// ─── Lookup Receipt ───────────────────────────────────────────────────────────
// GET /receipt-lookup?receiptNumber=POS-XXXX
export const lookupReceipt = CatchAsyncError(async (req, res, next) => {
    const receiptNumber = req.query.receiptNumber?.trim();
    if (!receiptNumber) {
        return next(new ErrorHandler("receiptNumber is required", 400));
    }
    const orders = await odooRequest("pos.order", "search_read", [
        [
            "|",
            ["pos_reference", "ilike", receiptNumber],
            ["name", "ilike", receiptNumber],
        ],
    ], {
        fields: [
            "id",
            "name",
            "pos_reference",
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
    });
    if (!orders?.length) {
        return next(new ErrorHandler("Receipt not found", 404));
    }
    const order = orders[0];
    if (order.state !== "paid" &&
        order.state !== "invoiced" &&
        order.state !== "done") {
        return next(new ErrorHandler(`Order is not paid (current state: ${order.state})`, 400));
    }
    const lines = order.lines?.length
        ? await odooRequest("pos.order.line", "search_read", [[["id", "in", order.lines]]], {
            fields: [
                "id",
                "product_id",
                "qty",
                "price_unit",
                "price_subtotal_incl",
                "discount",
                "tax_ids",
            ],
        })
        : [];
    const payments = order.payment_ids?.length
        ? await odooRequest("pos.payment", "search_read", [[["id", "in", order.payment_ids]]], { fields: ["payment_method_id", "amount"] })
        : [];
    const receipt = {
        odooOrderId: order.id,
        receiptNumber: order.name,
        date: order.date_order,
        cashier: order.user_id?.[1] ?? "Unknown",
        session: order.session_id?.[1] ?? "—",
        paymentMethod: payments[0]?.payment_method_id?.[1] ?? "Cash",
        originalTotal: order.amount_total,
        items: lines.map((l) => ({
            productId: l.product_id?.[0],
            name: l.product_id?.[1] ?? "—",
            sku: String(l.product_id?.[0] ?? ""),
            unitPrice: l.price_unit,
            taxRate: TAX_RATE,
            qty: l.qty,
            discount: l.discount ?? 0,
            subtotal: l.price_subtotal_incl,
            odooLineId: l.id, // needed for return creation
        })),
    };
    res.status(200).json({ success: true, receipt });
});
// ─── Create Return ────────────────────────────────────────────────────────────
// POST /returns
// Uses pos.order _create_from_ui or direct create with refunded_orderline_id
// which is the native Odoo way to mark a POS return
export const createReturn = CatchAsyncError(async (req, res, next) => {
    const { receiptNumber, odooOrderId, cashier, cashierId, reason, items, paymentMethod, notes, } = req.body;
    if (!receiptNumber)
        return next(new ErrorHandler("receiptNumber is required", 400));
    if (!reason)
        return next(new ErrorHandler("Return reason is required", 400));
    if (!items?.length)
        return next(new ErrorHandler("At least one item is required", 400));
    // 1. Find original order in Odoo
    let orderId = odooOrderId;
    if (!orderId) {
        const found = await odooRequest("pos.order", "search_read", [
            [
                "|",
                ["name", "=", receiptNumber],
                ["pos_reference", "=", receiptNumber],
            ],
        ], { fields: ["id", "session_id", "lines"], limit: 1 });
        if (!found?.length)
            return next(new ErrorHandler("Original order not found in Odoo", 404));
        orderId = found[0].id;
    }
    // 2. Read original order to get session_id and payment method id
    const [originalOrder] = await odooRequest("pos.order", "read", [[orderId]], { fields: ["id", "session_id", "lines", "payment_ids", "amount_total"] });
    if (!originalOrder)
        return next(new ErrorHandler("Failed to read order data", 404));
    const sessionId = originalOrder.session_id?.[0];
    // 3. Get payment method id from original order
    let paymentMethodId = false;
    if (originalOrder.payment_ids?.length) {
        const payments = await odooRequest("pos.payment", "search_read", [[["id", "in", originalOrder.payment_ids]]], { fields: ["payment_method_id", "amount"], limit: 1 });
        paymentMethodId = payments[0]?.payment_method_id?.[0] ?? false;
    }
    // 4. Fetch original lines to get refunded_orderline_id references
    const originalLines = originalOrder.lines?.length
        ? await odooRequest("pos.order.line", "search_read", [[["id", "in", originalOrder.lines]]], {
            fields: [
                "id",
                "product_id",
                "qty",
                "price_unit",
                "discount",
                "tax_ids",
            ],
        })
        : [];
    // 5. Compute totals
    const subtotal = round2(items.reduce((s, i) => s + i.unitPrice * i.qtyReturned, 0));
    const taxTotal = round2(subtotal * TAX_RATE);
    const total = round2(subtotal + taxTotal);
    // 6. Build return order lines with refunded_orderline_id (native Odoo field)
    const returnLines = items.map((item) => {
        const odooLine = item.odooLineId
            ? originalLines.find((l) => l.id === item.odooLineId)
            : originalLines.find((l) => l.product_id?.[0] === item.productId);
        return [
            0,
            0,
            {
                product_id: item.productId,
                qty: -Math.abs(item.qtyReturned), // negative = refund
                price_unit: item.unitPrice,
                price_subtotal: -round2(item.unitPrice * item.qtyReturned),
                price_subtotal_incl: -round2(item.unitPrice * item.qtyReturned * (1 + (item.taxRate ?? TAX_RATE))),
                discount: odooLine?.discount ?? 0,
                tax_ids: odooLine?.tax_ids?.length
                    ? [[6, 0, odooLine.tax_ids]]
                    : [],
                // This is the native Odoo field that marks a line as a refund
                // and links it back to the original order line
                ...(odooLine ? { refunded_orderline_id: odooLine.id } : {}),
            },
        ];
    });
    // 7. Create the refund order in Odoo
    // amount_* must be explicitly set — Odoo does not auto-compute on API create
    const returnOrderId = await odooRequest("pos.order", "create", [
        {
            session_id: sessionId,
            lines: returnLines,
            amount_tax: -taxTotal,
            amount_total: -total,
            amount_paid: 0,
            amount_return: 0,
            // stores reason visibly in Odoo backend: "Return of RECEIPT | reason — notes"
            pos_reference: `Return of ${receiptNumber} | ${reason}${notes ? " — " + notes : ""}`,
        },
    ]);
    if (!returnOrderId)
        return next(new ErrorHandler("Failed to create return order in Odoo", 500));
    // 8. Add the refund payment so it shows as paid in Odoo
    if (paymentMethodId) {
        await odooRequest("pos.payment", "create", [
            {
                pos_order_id: returnOrderId,
                payment_method_id: paymentMethodId,
                amount: -total,
            },
        ]).catch(() => {
            // Non-fatal: order is created, payment line optional
        });
    }
    // 9. Read back the created return order
    const [returnOrder] = await odooRequest("pos.order", "read", [[returnOrderId]], { fields: ["id", "name", "date_order", "state"] });
    res.status(201).json({
        success: true,
        message: "Return processed successfully in Odoo",
        return: {
            _id: String(returnOrderId),
            returnNumber: returnOrder?.name ?? `Return-${returnOrderId}`,
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
            createdAt: returnOrder?.date_order ?? new Date().toISOString(),
            items: items.map((item) => ({
                productId: item.productId,
                name: item.name,
                sku: item.sku ?? "",
                unitPrice: item.unitPrice,
                taxRate: item.taxRate ?? TAX_RATE,
                qtyReturned: item.qtyReturned,
                refundSubtotal: round2(item.unitPrice * item.qtyReturned),
                refundTax: round2(item.unitPrice * item.qtyReturned * (item.taxRate ?? TAX_RATE)),
                refundTotal: round2(item.unitPrice *
                    item.qtyReturned *
                    (1 + (item.taxRate ?? TAX_RATE))),
            })),
        },
    });
});
// ─── Get Returns ──────────────────────────────────────────────────────────────
// GET /returns
// A POS return in native Odoo = order whose lines have refunded_orderline_id set
// We identify them by pos_reference containing "Return" OR by checking lines
export const getReturns = CatchAsyncError(async (req, res, next) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const search = req.query.search || "";
    const status = req.query.status || "";
    const dateFrom = req.query.date_from;
    const dateTo = req.query.date_to;
    // Return orders are identified by pos_reference starting with "Return of"
    // (set in createReturn above) — this keeps them distinguishable from sales
    const domain = [["pos_reference", "like", "Return of"]];
    if (search) {
        domain.push("|");
        domain.push(["name", "ilike", search]);
        domain.push(["pos_reference", "ilike", search]);
    }
    if (dateFrom)
        domain.push(["date_order", ">=", `${dateFrom} 00:00:00`]);
    if (dateTo)
        domain.push(["date_order", "<=", `${dateTo} 23:59:59`]);
    // Map frontend status → Odoo state
    if (status === "completed") {
        domain.push("|", ["state", "=", "done"], "|", ["state", "=", "paid"], ["state", "=", "invoiced"]);
    }
    else if (status === "voided") {
        domain.push(["state", "=", "cancel"]);
    }
    else if (status === "pending") {
        domain.push(["state", "=", "draft"]);
    }
    const total = await odooRequest("pos.order", "search_count", [domain]);
    const orders = await odooRequest("pos.order", "search_read", [domain], {
        fields: [
            "id",
            "name",
            "pos_reference",
            "date_order",
            "amount_total",
            "amount_tax",
            "state",
            "user_id",
            "lines",
        ],
        limit,
        offset: (page - 1) * limit,
        order: "date_order desc",
    });
    // Batch fetch all lines
    const allLineIds = orders.flatMap((o) => o.lines ?? []);
    const allLines = allLineIds.length
        ? await odooRequest("pos.order.line", "search_read", [[["id", "in", allLineIds]]], {
            fields: [
                "id",
                "order_id",
                "product_id",
                "qty",
                "price_unit",
                "price_subtotal_incl",
            ],
        })
        : [];
    const linesByOrder = {};
    for (const line of allLines) {
        const oid = line.order_id?.[0];
        if (!linesByOrder[oid])
            linesByOrder[oid] = [];
        linesByOrder[oid].push(line);
    }
    const returns = orders.map((o) => {
        const lines = linesByOrder[o.id] ?? [];
        const subtotal = round2(lines.reduce((s, l) => s + Math.abs(l.price_unit) * Math.abs(l.qty), 0));
        const taxTotal = round2(subtotal * TAX_RATE);
        return {
            _id: String(o.id),
            returnNumber: o.name,
            receiptNumber: extractOriginalReceipt(o.pos_reference),
            cashier: o.user_id?.[1] ?? "Unknown",
            reason: extractReason(o.pos_reference),
            subtotal,
            taxTotal,
            total: round2(Math.abs(o.amount_total)),
            paymentMethod: "—",
            status: mapState(o.state),
            createdAt: o.date_order,
            updatedAt: o.date_order,
            items: lines.map((l) => ({
                name: l.product_id?.[1] ?? "—",
                sku: String(l.product_id?.[0] ?? ""),
                qtyReturned: Math.abs(l.qty),
                refundTotal: round2(Math.abs(l.price_subtotal_incl)),
            })),
        };
    });
    // Stats: all non-cancelled return orders
    const statsOrders = await odooRequest("pos.order", "search_read", [[["pos_reference", "like", "Return of"], ["state", "!=", "cancel"]]], { fields: ["amount_total", "lines"] });
    const totalRefunded = round2(statsOrders.reduce((s, o) => s + Math.abs(o.amount_total), 0));
    const totalItems = statsOrders.reduce((s, o) => s + (o.lines?.length ?? 0), 0);
    res.status(200).json({
        success: true,
        total,
        page,
        pages: Math.ceil(total / limit),
        stats: {
            totalRefunded,
            totalReturns: statsOrders.length,
            totalItems,
        },
        returns,
    });
});
// ─── Get Return By ID ─────────────────────────────────────────────────────────
export const getReturnById = CatchAsyncError(async (req, res, next) => {
    const id = Number(req.params.id);
    if (isNaN(id))
        return next(new ErrorHandler("Invalid ID", 400));
    const orders = await odooRequest("pos.order", "read", [[id]], {
        fields: [
            "id",
            "name",
            "pos_reference",
            "date_order",
            "amount_total",
            "amount_tax",
            "state",
            "user_id",
            "lines",
        ],
    });
    if (!orders?.length)
        return next(new ErrorHandler("Return order not found", 404));
    const o = orders[0];
    const lines = o.lines?.length
        ? await odooRequest("pos.order.line", "search_read", [[["id", "in", o.lines]]], {
            fields: [
                "id",
                "product_id",
                "qty",
                "price_unit",
                "price_subtotal_incl",
            ],
        })
        : [];
    const subtotal = round2(lines.reduce((s, l) => s + Math.abs(l.price_unit) * Math.abs(l.qty), 0));
    const taxTotal = round2(subtotal * TAX_RATE);
    res.status(200).json({
        success: true,
        return: {
            _id: String(o.id),
            returnNumber: o.name,
            receiptNumber: extractOriginalReceipt(o.pos_reference),
            cashier: o.user_id?.[1] ?? "Unknown",
            reason: extractReason(o.pos_reference),
            subtotal,
            taxTotal,
            total: round2(Math.abs(o.amount_total)),
            status: mapState(o.state),
            createdAt: o.date_order,
            updatedAt: o.date_order,
            items: lines.map((l) => ({
                productId: l.product_id?.[0],
                name: l.product_id?.[1] ?? "—",
                sku: String(l.product_id?.[0] ?? ""),
                unitPrice: Math.abs(l.price_unit),
                taxRate: TAX_RATE,
                qtyReturned: Math.abs(l.qty),
                refundSubtotal: round2(Math.abs(l.price_unit) * Math.abs(l.qty)),
                refundTax: round2(Math.abs(l.price_unit) * Math.abs(l.qty) * TAX_RATE),
                refundTotal: round2(Math.abs(l.price_subtotal_incl)),
            })),
        },
    });
});
// ─── Void Return ──────────────────────────────────────────────────────────────
export const voidReturn = CatchAsyncError(async (req, res, next) => {
    const id = Number(req.params.id);
    const { voidedBy, notes } = req.body;
    if (isNaN(id))
        return next(new ErrorHandler("Invalid ID", 400));
    const orders = await odooRequest("pos.order", "read", [[id]], { fields: ["id", "name", "state", "pos_reference"] });
    if (!orders?.length)
        return next(new ErrorHandler("Return order not found", 404));
    const order = orders[0];
    if (order.state === "cancel")
        return next(new ErrorHandler("Return order is already voided", 400));
    // Try native cancel method first, fall back to direct write
    await odooRequest("pos.order", "action_pos_order_cancel", [[id]]).catch(async () => {
        await odooRequest("pos.order", "write", [
            [id],
            {
                state: "cancel",
            },
        ]);
    });
    res.status(200).json({
        success: true,
        message: "Return order voided successfully",
        return: {
            _id: String(id),
            returnNumber: order.name,
            status: "voided",
            voidedBy: voidedBy ?? "Unknown",
            voidedAt: new Date().toISOString(),
        },
    });
});
// ─── Get Return Stats ─────────────────────────────────────────────────────────
export const getReturnStats = CatchAsyncError(async (req, res, next) => {
    const dateFrom = req.query.date_from;
    const dateTo = req.query.date_to;
    const domain = [
        ["pos_reference", "like", "Return of"],
        ["state", "!=", "cancel"],
    ];
    if (dateFrom)
        domain.push(["date_order", ">=", `${dateFrom} 00:00:00`]);
    if (dateTo)
        domain.push(["date_order", "<=", `${dateTo} 23:59:59`]);
    const orders = await odooRequest("pos.order", "search_read", [domain], { fields: ["id", "amount_total", "lines", "pos_reference", "date_order"] });
    const totalRefunded = round2(orders.reduce((s, o) => s + Math.abs(o.amount_total), 0));
    const totalReturns = orders.length;
    const totalItems = orders.reduce((s, o) => s + (o.lines?.length ?? 0), 0);
    const avgRefund = totalReturns > 0 ? round2(totalRefunded / totalReturns) : 0;
    // Group by reason
    const reasonMap = {};
    for (const o of orders) {
        const r = extractReason(o.pos_reference) || "Unspecified";
        if (!reasonMap[r])
            reasonMap[r] = { count: 0, total: 0 };
        reasonMap[r].count += 1;
        reasonMap[r].total = round2(reasonMap[r].total + Math.abs(o.amount_total));
    }
    const byReason = Object.entries(reasonMap)
        .map(([_id, v]) => ({ _id, ...v }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    // Daily breakdown
    const dailyMap = {};
    for (const o of orders) {
        const day = o.date_order?.slice(0, 10) ?? "unknown";
        if (!dailyMap[day])
            dailyMap[day] = { count: 0, total: 0 };
        dailyMap[day].count += 1;
        dailyMap[day].total = round2(dailyMap[day].total + Math.abs(o.amount_total));
    }
    const daily = Object.entries(dailyMap)
        .map(([_id, v]) => ({ _id, ...v }))
        .sort((a, b) => a._id.localeCompare(b._id));
    res.status(200).json({
        success: true,
        stats: { totalRefunded, totalReturns, totalItems, avgRefund, byReason, daily },
    });
});
