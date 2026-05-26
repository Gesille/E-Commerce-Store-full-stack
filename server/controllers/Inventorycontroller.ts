import { Request, Response } from "express";
import mongoose from "mongoose";
import {
  startOfDay, endOfDay,
  startOfWeek, endOfWeek,
  startOfMonth, endOfMonth,
  subWeeks, format, eachDayOfInterval,
} from "date-fns";
import POSOrder from "../models/POSOrder.js";
import Product from "../models/product.model.js";
import Return from "../models/Return.model.js";

// ─── Helper ───────────────────────────────────────────────────────────────────

function getDateRange(range: string): { from: Date; to: Date } {
  const now = new Date();
  // normalise: trim + lowercase so "Week", "WEEK", " week" all match
  const r = (range ?? "").trim().toLowerCase();
  switch (r) {
    case "day":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "month":
      return { from: startOfMonth(now), to: endOfMonth(now) };
    default: // "week" and anything else
      return {
        from: startOfWeek(now, { weekStartsOn: 1 }),
        to: endOfWeek(now, { weekStartsOn: 1 }),
      };
  }
}

// ─── GET /api/pos/inventory ───────────────────────────────────────────────────

export async function getInventory(req: Request, res: Response) {
  try {
    const range = (req.query.range as string) || "week";
    const { from, to } = getDateRange(range);

    // ── 1. Sales aggregation ──────────────────────────────────────────────────
    // cart.productId may be stored as ObjectId OR as a plain string.
    // We normalise to string in both the aggregation key and the lookup.
    const salesAgg = await POSOrder.aggregate([
      { $match: { status: "paid", createdAt: { $gte: from, $lte: to } } },
      { $unwind: "$cart" },
      {
        $group: {
          // convert ObjectId → string so Map keys are always plain strings
          _id: { $toString: "$cart.productId" },
          sold: { $sum: "$cart.qty" },
          revenue: { $sum: { $multiply: ["$cart.price", "$cart.qty"] } },
        },
      },
    ]);

    // ── 2. Returns aggregation ────────────────────────────────────────────────
    // items.productId is the Odoo integer id (Number)
    const returnsAgg = await Return.aggregate([
      { $match: { status: "completed", createdAt: { $gte: from, $lte: to } } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId", // Odoo integer
          returned: { $sum: "$items.qtyReturned" },
        },
      },
    ]);

    // Build lookup maps
    const salesMap = new Map<string, { sold: number; revenue: number }>(
      salesAgg.map((s) => [String(s._id), { sold: s.sold, revenue: s.revenue }])
    );

    const returnsMap = new Map<number, number>(
      returnsAgg
        .filter((r) => r._id != null) // guard against null odoo ids
        .map((r) => [Number(r._id), r.returned])
    );

    // ── 3. Enrich all products ────────────────────────────────────────────────
    const products = await Product.find().lean();

    const enriched = products.map((p) => {
      const mongoId = String(p._id);
      const salesEntry = salesMap.get(mongoId);
      const sold = salesEntry?.sold ?? 0;

      // guard: odooProductId could be null/undefined → treat as 0 returned
      const odooId = p.odooProductId != null ? Number(p.odooProductId) : null;
      const returned = odooId != null ? (returnsMap.get(odooId) ?? 0) : 0;

      return {
        _id: mongoId,
        name: p.name,
        reference: p.reference ?? "",
        barcode: p.barcode ?? "",
        price: p.price ?? 0,
        stock: p.stock ?? 0,
        image: p.image ?? "",
        odooProductId: p.odooProductId,
        sold,
        returned,
        netMovement: returned - sold,
        stockValue: (p.stock ?? 0) * (p.price ?? 0),
      };
    });

    // ── 4. Daily chart data ───────────────────────────────────────────────────
    const days = eachDayOfInterval({ start: from, end: to });

    const [dailySalesAgg, dailyReturnsAgg] = await Promise.all([
      POSOrder.aggregate([
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
      ]),
      Return.aggregate([
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
      ]),
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

    // ── 5. Last-4-weeks summary (fixed — not affected by range param) ─────────
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
        POSOrder.aggregate([
          { $match: { status: "paid", createdAt: { $gte: wStart, $lte: wEnd } } },
          { $unwind: "$cart" },
          {
            $group: {
              _id: null,
              sold: { $sum: "$cart.qty" },
              revenue: {
                $sum: { $multiply: ["$cart.price", "$cart.qty"] },
              },
            },
          },
        ]),
        Return.aggregate([
          {
            $match: {
              status: "completed",
              createdAt: { $gte: wStart, $lte: wEnd },
            },
          },
          { $unwind: "$items" },
          {
            $group: { _id: null, returned: { $sum: "$items.qtyReturned" } },
          },
        ]),
      ]);

      weekly.push({
        weekLabel: `${format(wStart, "MMM d")} – ${format(wEnd, "MMM d")}`,
        sold: wSales[0]?.sold ?? 0,
        returned: wReturns[0]?.returned ?? 0,
        revenue: wSales[0]?.revenue ?? 0,
      });
    }

    return res.json({ products: enriched, daily, weekly });
  } catch (err) {
    console.error("[Inventory] getInventory error:", err);
    return res.status(500).json({ error: "Failed to fetch inventory" });
  }
}

// ─── GET /api/pos/inventory/summary ──────────────────────────────────────────

export async function getInventorySummary(_req: Request, res: Response) {
  try {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    const [products, salesAgg, returnsAgg] = await Promise.all([
      Product.find({}, { stock: 1, price: 1 }).lean(),
      POSOrder.aggregate([
        {
          $match: {
            status: "paid",
            createdAt: { $gte: todayStart, $lte: todayEnd },
          },
        },
        { $unwind: "$cart" },
        {
          $group: {
            _id: null,
            soldToday: { $sum: "$cart.qty" },
            revenueToday: {
              $sum: { $multiply: ["$cart.price", "$cart.qty"] },
            },
          },
        },
      ]),
      Return.aggregate([
        {
          $match: {
            status: "completed",
            createdAt: { $gte: todayStart, $lte: todayEnd },
          },
        },
        { $unwind: "$items" },
        {
          $group: { _id: null, returnedToday: { $sum: "$items.qtyReturned" } },
        },
      ]),
    ]);

    const totalStockValue = products.reduce(
      (sum, p) => sum + (p.stock ?? 0) * (p.price ?? 0),
      0
    );
    const lowStockCount = products.filter(
      (p) => (p.stock ?? 0) > 0 && (p.stock ?? 0) <= 5
    ).length;

    return res.json({
      totalProducts: products.length,
      totalStockValue,
      lowStockCount,
      soldToday: salesAgg[0]?.soldToday ?? 0,
      returnedToday: returnsAgg[0]?.returnedToday ?? 0,
      revenueToday: salesAgg[0]?.revenueToday ?? 0,
    });
  } catch (err) {
    console.error("[Inventory] getInventorySummary error:", err);
    return res.status(500).json({ error: "Failed to fetch summary" });
  }
}

// ─── GET /api/pos/inventory/movements ────────────────────────────────────────

export async function getInventoryMovements(req: Request, res: Response) {
  try {
    const range = (req.query.range as string) || "week";
    const limit = Math.min(
      parseInt(req.query.limit as string) || 50,
      200
    );
    const { from, to } = getDateRange(range);

    // Fetch double the limit from each source so after merge we still have enough
    const fetchLimit = limit * 2;

    const [salesDocs, returnDocs] = await Promise.all([
      POSOrder.find({ status: "paid", createdAt: { $gte: from, $lte: to } })
        .sort({ createdAt: -1 })
        .limit(fetchLimit)
        .populate<{ cashierId: { name: string } | null }>("cashierId", "name")
        .lean(),
      Return.find({ status: "completed", createdAt: { $gte: from, $lte: to } })
        .sort({ createdAt: -1 })
        .limit(fetchLimit)
        .lean(),
    ]);

    type Move = {
      _id: string;
      type: "sale" | "return";
      productName: string;
      qty: number;
      price: number;
      cashier: string;
      receiptNumber: string;
      date: string;
    };

    const saleMoves: Move[] = salesDocs.flatMap((order) =>
      order.cart.map((item: any) => ({
        _id: `${order._id}-${item.productId}`,
        type: "sale" as const,
        productName: item.name ?? "—",
        qty: item.qty,
        price: item.price,
        cashier: (order.cashierId as any)?.name ?? "Unknown",
        receiptNumber: order.receiptNumber ?? "—",
        date: (order.createdAt as Date).toISOString(),
      }))
    );

    const returnMoves: Move[] = (returnDocs as any[]).flatMap((ret) =>
      ret.items.map((item: any) => ({
        _id: `${ret._id}-${item.productId}`,
        type: "return" as const,
        productName: item.name ?? "—",
        qty: item.qtyReturned,
        price: item.unitPrice,
        cashier: ret.cashier ?? "Unknown",
        receiptNumber: ret.receiptNumber ?? "—",
        date: (ret.createdAt as Date).toISOString(),
      }))
    );

    const movements = [...saleMoves, ...returnMoves]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);

    return res.json({ movements });
  } catch (err) {
    console.error("[Inventory] getInventoryMovements error:", err);
    return res.status(500).json({ error: "Failed to fetch movements" });
  }
}

// ─── GET /api/pos/inventory/product/:productId/movements ─────────────────────

export async function getProductMovements(req: Request, res: Response) {
  try {
    const { productId } = req.params;
    const range = (req.query.range as string) || "week";
    const { from, to } = getDateRange(range);

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ error: "Invalid productId" });
    }

    const oid = new mongoose.Types.ObjectId(productId);

    const product = await Product.findById(oid).lean();
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const odooId =
      product.odooProductId != null ? Number(product.odooProductId) : null;

    const [salesDocs, returnDocs] = await Promise.all([
      POSOrder.find({
        status: "paid",
        createdAt: { $gte: from, $lte: to },
        "cart.productId": oid,
      })
        .sort({ createdAt: -1 })
        .populate<{ cashierId: { name: string } | null }>("cashierId", "name")
        .lean(),

      // Only query returns if we have a valid odoo id
      odooId != null
        ? Return.find({
            status: "completed",
            createdAt: { $gte: from, $lte: to },
            "items.productId": odooId,
          })
            .sort({ createdAt: -1 })
            .lean()
        : Promise.resolve([]),
    ]);

    type Move = {
      _id: string;
      type: "sale" | "return";
      productName: string;
      qty: number;
      price: number;
      cashier: string;
      receiptNumber: string;
      date: string;
    };

    const moves: Move[] = [];

    for (const order of salesDocs) {
      const matchingItems = order.cart.filter(
        (c: any) => String(c.productId) === productId
      );
      for (const item of matchingItems) {
        moves.push({
          _id: `${order._id}-sale-${item.productId}`,
          type: "sale",
          productName: item.name ?? "—",
          qty: item.qty,
          price: item.price,
          cashier: (order.cashierId as any)?.name ?? "Unknown",
          receiptNumber: order.receiptNumber ?? "—",
          date: (order.createdAt as Date).toISOString(),
        });
      }
    }

    for (const ret of returnDocs as any[]) {
      const matchingItems = ret.items.filter(
        (i: any) => odooId != null && Number(i.productId) === odooId
      );
      for (const item of matchingItems) {
        moves.push({
          _id: `${ret._id}-return-${item.productId}`,
          type: "return",
          productName: item.name ?? "—",
          qty: item.qtyReturned,
          price: item.unitPrice,
          cashier: ret.cashier ?? "Unknown",
          receiptNumber: ret.receiptNumber ?? "—",
          date: (ret.createdAt as Date).toISOString(),
        });
      }
    }

    moves.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return res.json({ movements: moves });
  } catch (err) {
    console.error("[Inventory] getProductMovements error:", err);
    return res.status(500).json({ error: "Failed to fetch product movements" });
  }
}