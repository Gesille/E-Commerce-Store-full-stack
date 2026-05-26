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
  switch (range) {
    case "day":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "month":
      return { from: startOfMonth(now), to: endOfMonth(now) };
    default: // "week"
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

    // 1. Sales: group by cart.productId (stored as ObjectId string in POSOrder)
    const salesAgg = await POSOrder.aggregate([
      { $match: { status: "paid", createdAt: { $gte: from, $lte: to } } },
      { $unwind: "$cart" },
      {
        $group: {
          _id: { $toString: "$cart.productId" }, // normalise to string
          sold: { $sum: "$cart.qty" },
          revenue: { $sum: { $multiply: ["$cart.price", "$cart.qty"] } },
        },
      },
    ]);

    // 2. Returns: items.productId is the Odoo integer id (Number)
    //    We join on product.odooProductId later, so group by that number here.
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

    // salesMap: mongo _id string → sold qty
    const salesMap = new Map<string, { sold: number; revenue: number }>(
      salesAgg.map((s) => [String(s._id), { sold: s.sold, revenue: s.revenue }])
    );
    // returnsMap: odooProductId number → returned qty
    const returnsMap = new Map<number, number>(
      returnsAgg.map((r) => [Number(r._id), r.returned])
    );

    // 3. Enrich all products
    const products = await Product.find().lean();

    const enriched = products.map((p) => {
      const mongoId = String(p._id);
      const salesEntry = salesMap.get(mongoId);
      const sold = salesEntry?.sold ?? 0;
      const returned = returnsMap.get(Number(p.odooProductId)) ?? 0;
      return {
        _id: mongoId,
        name: p.name,
        reference: p.reference ?? "",
        barcode: p.barcode ?? "",
        price: p.price,
        stock: p.stock,
        image: p.image ?? "",
        odooProductId: p.odooProductId,
        sold,
        returned,
        netMovement: returned - sold,
        stockValue: p.stock * p.price,
      };
    });

    // 4. Daily chart data
    const days = eachDayOfInterval({ start: from, end: to });

    const [dailySalesAgg, dailyReturnsAgg] = await Promise.all([
      POSOrder.aggregate([
        { $match: { status: "paid", createdAt: { $gte: from, $lte: to } } },
        { $unwind: "$cart" },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" } },
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
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" } },
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

    // 5. Last-4-weeks summary (always fixed — not affected by range param)
    const weekly: { weekLabel: string; sold: number; returned: number; revenue: number }[] = [];

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
              revenue: { $sum: { $multiply: ["$cart.price", "$cart.qty"] } },
            },
          },
        ]),
        Return.aggregate([
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

export async function getInventorySummary(_req: Request, res: Response) {
  try {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    const [products, salesAgg, returnsAgg] = await Promise.all([
      Product.find({}, { stock: 1, price: 1 }).lean(),
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

    const totalStockValue = products.reduce((sum, p) => sum + (p.stock ?? 0) * (p.price ?? 0), 0);
    const lowStockCount = products.filter((p) => (p.stock ?? 0) > 0 && (p.stock ?? 0) <= 5).length;

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

export async function getInventoryMovements(req: Request, res: Response) {
  try {
    const range = (req.query.range as string) || "week";
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const { from, to } = getDateRange(range);

    // Fetch double the limit from each source so after merge we still have enough
    const [salesDocs, returnDocs] = await Promise.all([
      POSOrder.find({ status: "paid", createdAt: { $gte: from, $lte: to } })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate<{ cashierId: { name: string } | null }>("cashierId", "name")
        .lean(),
      Return.find({ status: "completed", createdAt: { $gte: from, $lte: to } })
        .sort({ createdAt: -1 })
        .limit(limit)
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

    const returnMoves: Move[] = returnDocs.flatMap((ret: any) =>
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

    res.json({ movements });
  } catch (err) {
    console.error("[Inventory] getInventoryMovements error:", err);
    res.status(500).json({ error: "Failed to fetch movements" });
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

    // Look up the product first to get its odooProductId for returns
    const product = await Product.findById(oid).lean();
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const [salesDocs, returnDocs] = await Promise.all([
      // POSOrder stores cart.productId as ObjectId
      POSOrder.find({
        status: "paid",
        createdAt: { $gte: from, $lte: to },
        "cart.productId": oid,
      })
        .sort({ createdAt: -1 })
        .populate<{ cashierId: { name: string } | null }>("cashierId", "name")
        .lean(),

      // Return stores items.productId as Odoo integer
      Return.find({
        status: "completed",
        createdAt: { $gte: from, $lte: to },
        "items.productId": Number(product.odooProductId),
      })
        .sort({ createdAt: -1 })
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
        (i: any) => Number(i.productId) === Number(product.odooProductId)
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

    moves.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.json({ movements: moves });
  } catch (err) {
    console.error("[Inventory] getProductMovements error:", err);
    res.status(500).json({ error: "Failed to fetch product movements" });
  }
}