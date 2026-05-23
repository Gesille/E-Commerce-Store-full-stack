import { Request, Response } from "express";
import mongoose from "mongoose";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subWeeks,
  format,
  eachDayOfInterval,
} from "date-fns";
import POSOrder from "../models/POSOrder.js";
import Product from "../models/product.model.js";
import Return from "../models/Return.model.js";


// ─── Aggregation result interfaces ───────────────────────────────────────────

interface SalesQtyAgg {
  _id: mongoose.Types.ObjectId | string;
  sold: number;
}

interface ReturnsQtyAgg {
  _id: mongoose.Types.ObjectId | string;
  returned: number;
}

interface DailySalesAgg {
  _id: string; // "YYYY-MM-DD"
  sold: number;
  revenue: number;
}

interface DailyReturnsAgg {
  _id: string; // "YYYY-MM-DD"
  returned: number;
}

interface WeeklySalesAgg {
  _id: null;
  sold: number;
  revenue: number;
}

interface WeeklyReturnsAgg {
  _id: null;
  returned: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Resolve date range boundaries from a range string. */
function getDateRange(range: string): { from: Date; to: Date } {
  const now = new Date();
  switch (range) {
    case "day":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "week":
      return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
    case "month":
      return { from: startOfMonth(now), to: endOfMonth(now) };
    default:
      return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
  }
}

// ─── GET /api/pos/inventory ───────────────────────────────────────────────────
/**
 * Returns all products enriched with:
 * - sold qty in the range
 * - returned qty in the range
 * - net movement
 * - stock value
 * - daily movements (for bar chart)
 * - weekly movements (for weekly summary table)
 */
export async function getInventory(req: Request, res: Response) {
  try {
    const range = (req.query.range as string) || "week";
    const { from, to } = getDateRange(range);

    // ── 1. Aggregate sold quantities per product from POS orders ──────────────
    const salesAgg = await POSOrder.aggregate<SalesQtyAgg>([
      {
        $match: {
          status: { $in: ["paid"] },
          createdAt: { $gte: from, $lte: to },
        },
      },
      { $unwind: "$cart" },
      {
        $group: {
          _id: "$cart.productId",
          sold: { $sum: "$cart.qty" },
        },
      },
    ]);


    const returnsAgg = await Return.aggregate<ReturnsQtyAgg>([
      {
        $match: {
          status: { $in: ["completed"] },
          createdAt: { $gte: from, $lte: to },
        },
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          returned: { $sum: "$items.qtyReturned" },
        },
      },
    ]);

    const salesMap = new Map<string, number>(salesAgg.map((s) => [String(s._id), s.sold]));
    const returnsMap = new Map<string, number>(returnsAgg.map((r) => [String(r._id), r.returned]));

    // ── 3. Fetch all products ─────────────────────────────────────────────────
    const products = await Product.find().lean();

    const enriched = products.map((p) => {
      const idStr = String(p._id);
      // returns use odooProductId as key
      const sold = salesMap.get(idStr) ?? 0;
      const returned = returnsMap.get(idStr) ?? returnsMap.get(String(p.odooProductId)) ?? 0;
      return {
        _id: idStr,
        name: p.name,
        reference: p.reference,
        barcode: p.barcode,
        price: p.price,
        stock: p.stock,
        image: p.image,
        odooProductId: p.odooProductId,
        sold,
        returned,
        netMovement: returned - sold, // negative = net outflow
        stockValue: p.stock * p.price,
      };
    });

    // ── 4. Build daily movement data for chart ────────────────────────────────
    const days = eachDayOfInterval({ start: from, end: to });

    const dailySalesAgg = await POSOrder.aggregate<DailySalesAgg>([
      { $match: { status: "paid", createdAt: { $gte: from, $lte: to } } },
      { $unwind: "$cart" },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" },
          },
          sold: { $sum: "$cart.qty" },
          revenue: { $sum: { $multiply: ["$cart.price", "$cart.qty"] } },
        },
      },
    ]);

    const dailyReturnsAgg = await Return.aggregate<DailyReturnsAgg>([
      { $match: { status: "completed", createdAt: { $gte: from, $lte: to } } },
      { $unwind: "$items" },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" },
          },
          returned: { $sum: "$items.qtyReturned" },
        },
      },
    ]);

    const dailySalesMap = new Map<string, { sold: number; revenue: number }>(
      dailySalesAgg.map((d) => [d._id, { sold: d.sold, revenue: d.revenue }])
    );
    const dailyReturnsMap = new Map<string, number>(
      dailyReturnsAgg.map((d) => [d._id, d.returned])
    );

    const daily = days.map((day) => {
      const key = format(day, "yyyy-MM-dd");
      const s = dailySalesMap.get(key) ?? { sold: 0, revenue: 0 };
      const ret = dailyReturnsMap.get(key) ?? 0;
      return {
        date: day.toISOString(),
        sold: s.sold,
        returned: ret,
        netQty: s.sold - ret,
        revenue: s.revenue,
      };
    });

    // ── 5. Build last-4-weeks summary ─────────────────────────────────────────
    const weekly: {
      weekLabel: string;
      sold: number;
      returned: number;
      revenue: number;
    }[] = [];

    for (let i = 3; i >= 0; i--) {
      const wStart = startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
      const wEnd = endOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });

      const [wSales, wReturns] = await Promise.all([
        POSOrder.aggregate<WeeklySalesAgg>([
          { $match: { status: "paid", createdAt: { $gte: wStart, $lte: wEnd } } },
          { $unwind: "$cart" },
          {
            $group: {
              _id: null,
              sold: { $sum: "$cart.qty" },
              revenue: { $sum: { $multiply: ["$cart.price", "$cart.qty"] } },
            },
          },
        ]),
        Return.aggregate<WeeklyReturnsAgg>([
          { $match: { status: "completed", createdAt: { $gte: wStart, $lte: wEnd } } },
          { $unwind: "$items" },
          { $group: { _id: null, returned: { $sum: "$items.qtyReturned" } } },
        ]),
      ]);

      weekly.push({
        weekLabel: `${format(wStart, "MMM d")} – ${format(wEnd, "MMM d")}`,
        sold: wSales[0]?.sold ?? 0,
        returned: wReturns[0]?.returned ?? 0,
        revenue: wSales[0]?.revenue ?? 0,
      });
    }

    res.json({ products: enriched, daily, weekly });
  } catch (err) {
    console.error("[Inventory] getInventory error:", err);
    res.status(500).json({ error: "Failed to fetch inventory" });
  }
}

// ─── GET /api/pos/inventory/summary ──────────────────────────────────────────
/**
 * Quick KPI stats for the dashboard header cards.
 */
export async function getInventorySummary(req: Request, res: Response) {
  try {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    const [products, salesAgg, returnsAgg] = await Promise.all([
      Product.find().lean(),
      POSOrder.aggregate([
        { $match: { status: "paid", createdAt: { $gte: todayStart, $lte: todayEnd } } },
        { $unwind: "$cart" },
        {
          $group: {
            _id: null,
            soldToday: { $sum: "$cart.qty" },
            revenueToday: { $sum: { $multiply: ["$cart.price", "$cart.qty"] } },
          },
        },
      ]),
      Return.aggregate([
        { $match: { status: "completed", createdAt: { $gte: todayStart, $lte: todayEnd } } },
        { $unwind: "$items" },
        { $group: { _id: null, returnedToday: { $sum: "$items.qtyReturned" } } },
      ]),
    ]);

    const totalStockValue = products.reduce((sum:any, p:any) => sum + p.stock * p.price, 0);
    const lowStockCount = products.filter((p:any) => p.stock > 0 && p.stock <= 5).length;

    res.json({
      totalProducts: products.length,
      totalStockValue,
      lowStockCount,
      soldToday: salesAgg[0]?.soldToday ?? 0,
      returnedToday: returnsAgg[0]?.returnedToday ?? 0,
      revenueToday: salesAgg[0]?.revenueToday ?? 0,
    });
  } catch (err) {
    console.error("[Inventory] getInventorySummary error:", err);
    res.status(500).json({ error: "Failed to fetch summary" });
  }
}

// ─── GET /api/pos/inventory/movements ────────────────────────────────────────
/**
 * Combined stream of sales + return movements across all products.
 * Used for the "Movements" tab.
 */
export async function getInventoryMovements(req: Request, res: Response) {
  try {
    const range = (req.query.range as string) || "week";
    const limit = parseInt(req.query.limit as string) || 50;
    const { from, to } = getDateRange(range);

    // Sales movements
    const salesDocs = await POSOrder.find({
      status: "paid",
      createdAt: { $gte: from, $lte: to },
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("cashierId", "name")
      .lean();

    const saleMoves: {
      _id: string;
      type: "sale" | "return";
      productName: string;
      qty: number;
      price: number;
      cashier: string;
      receiptNumber: string;
      date: string;
    }[] = [];

    for (const order of salesDocs) {
      for (const item of order.cart) {
        saleMoves.push({
          _id: `${order._id}-${item.productId}`,
          type: "sale",
          productName: item.name,
          qty: item.qty,
          price: item.price,
          cashier: (order.cashierId as any)?.name ?? "Unknown",
          receiptNumber: order.receiptNumber,
          date: (order.createdAt as Date).toISOString(),
        });
      }
    }

    // Return movements
    const returnDocs = await Return.find({
      status: "completed",
      createdAt: { $gte: from, $lte: to },
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const returnMoves: typeof saleMoves = [];
    for (const ret of returnDocs) {
      for (const item of ret.items) {
        returnMoves.push({
          _id: `${ret._id}-${item.productId}`,
          type: "return",
          productName: item.name,
          qty: item.qtyReturned,
          price: item.unitPrice,
          cashier: ret.cashier,
          receiptNumber: ret.receiptNumber,
          date: (ret.createdAt as Date).toISOString(),
        });
      }
    }

    // Merge and sort by date desc
    const movements = [...saleMoves, ...returnMoves]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);

    res.json({ movements });
  } catch (err) {
    console.error("[Inventory] getInventoryMovements error:", err);
    res.status(500).json({ error: "Failed to fetch movements" });
  }
}

// ─── GET /api/pos/inventory/product/:productId/movements ─────────────────────
/**
 * Detailed movement history for a single product.
 * Called when the user expands a row in the product table.
 */
export async function getProductMovements(req: Request, res: Response) {
  try {
    const { productId } = req.params;
    const range = (req.query.range as string) || "week";
    const { from, to } = getDateRange(range);

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ error: "Invalid productId" });
    }

    const oid = new mongoose.Types.ObjectId(productId);

    // Sales for this product
    const salesDocs = await POSOrder.find({
      status: "paid",
      createdAt: { $gte: from, $lte: to },
      "cart.productId": oid,
    })
      .sort({ createdAt: -1 })
      .populate("cashierId", "name")
      .lean();

    const moves: {
      _id: string;
      type: "sale" | "return";
      productName: string;
      qty: number;
      price: number;
      cashier: string;
      receiptNumber: string;
      date: string;
    }[] = [];

    for (const order of salesDocs) {
      const items = order.cart.filter((c) => String(c.productId) === productId);
      for (const item of items) {
        moves.push({
          _id: `${order._id}-sale`,
          type: "sale",
          productName: item.name,
          qty: item.qty,
          price: item.price,
          cashier: (order.cashierId as any)?.name ?? "Unknown",
          receiptNumber: order.receiptNumber,
          date: (order.createdAt as Date).toISOString(),
        });
      }
    }

    // Find the product to get its odooProductId for returns lookup
    const product = await Product.findById(productId).lean();
    if (product) {
      const returnDocs = await Return.find({
        status: "completed",
        createdAt: { $gte: from, $lte: to },
        "items.productId": product.odooProductId,
      })
        .sort({ createdAt: -1 })
        .lean();

      for (const ret of returnDocs) {
        const items = ret.items.filter((i) => i.productId === product.odooProductId);
        for (const item of items) {
          moves.push({
            _id: `${ret._id}-return`,
            type: "return",
            productName: item.name,
            qty: item.qtyReturned,
            price: item.unitPrice,
            cashier: ret.cashier,
            receiptNumber: ret.receiptNumber,
            date: (ret.createdAt as Date).toISOString(),
          });
        }
      }
    }

    // Sort by date descending
    moves.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.json({ movements: moves });
  } catch (err) {
    console.error("[Inventory] getProductMovements error:", err);
    res.status(500).json({ error: "Failed to fetch product movements" });
  }
}