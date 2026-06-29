import { Request, Response } from "express";
import { odooRequest } from "../odoo/odoo.client.js";

// ─── Get all suppliers ────────────────────────────────────────────────────────
export const getSuppliers = async (req: Request, res: Response) => {
  try {
    const suppliers = await odooRequest(
      "res.partner",
      "search_read",
      [[["supplier_rank", ">", 0]]],
      { fields: ["id", "name", "ref"], order: "name asc" }
    );
    return res.json({ success: true, suppliers });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Get all products ─────────────────────────────────────────────────────────
export const getProductsForPO = async (req: Request, res: Response) => {
  try {
 
    const products = await odooRequest(
      "product.template",          
      "search_read",
      [[["active", "=", true]]],  
      {
        fields: ["id", "name", "uom_id", "standard_price"],
        order: "name asc",
      }
    );

    return res.json({ success: true, products });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Create Purchase Order ────────────────────────────────────────────────────
export const createPurchaseOrder = async (req: Request, res: Response) => {
  try {
    const { supplierId, lines, expectedDate, notes } = req.body;

    if (!supplierId) {
      return res.status(400).json({ success: false, message: "supplierId is required" });
    }

    if (!lines?.length) {
      return res.status(400).json({ success: false, message: "At least one line is required" });
    }

    // 1. Validate products
    const productIds = lines.map((l: any) => l.productId);
    const products = await odooRequest(
      "product.product",
      "search_read",
      [[["id", "in", productIds]]],
      { fields: ["id", "uom_po_id", "uom_id"] }
    );

    const productMap: Record<number, any> = {};
    products.forEach((p: any) => (productMap[p.id] = p));

    const missing = productIds.filter((id: number) => !productMap[id]);
    if (missing.length) {
      return res.status(400).json({
        success: false,
        message: `Products not found: ${missing.join(", ")}`,
      });
    }

    // 2. Build order lines
    const plannedDate = expectedDate
      ? new Date(expectedDate).toISOString()
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const orderLines = lines.map((line: any) => {
      const product = productMap[line.productId];
      const uomId = product.uom_po_id?.[0] ?? product.uom_id?.[0] ?? 1;
      return [
        0, 0,
        {
          product_id: line.productId,
          product_qty: line.qty,
          price_unit: line.unitPrice,
          date_planned: plannedDate,
          product_uom: uomId,
        },
      ];
    });

    // 3. Create PO
    const poId = await odooRequest("purchase.order", "create", [
      {
        partner_id: Number(supplierId),
        order_line: orderLines,
        notes: notes || false,
      },
    ]);

    // 4. Return PO details (RFQ — not confirmed yet)
    const po = await odooRequest(
      "purchase.order",
      "search_read",
      [[["id", "=", poId]]],
      { fields: ["name", "state", "amount_total"], limit: 1 }
    );

    return res.status(201).json({
      success: true,
      purchaseOrderId: poId,
      purchaseOrderName: po[0].name,
      state: po[0].state,
      total: po[0].amount_total,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Confirm Purchase Order ───────────────────────────────────────────────────
export const confirmPurchaseOrder = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await odooRequest("purchase.order", "button_confirm", [[id]]);

    const po = await odooRequest(
      "purchase.order",
      "search_read",
      [[["id", "=", id]]],
      { fields: ["name", "state", "picking_ids"], limit: 1 }
    );

    return res.json({
      success: true,
      purchaseOrderName: po[0].name,
      state: po[0].state,
      pickingIds: po[0].picking_ids ?? [],
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Receive goods ────────────────────────────────────────────────────────────
export const receivePurchaseOrder = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.pickingId);

    const picking = await odooRequest(
      "stock.picking",
      "search_read",
      [[["id", "=", id]]],
      { fields: ["state", "picking_type_code"], limit: 1 }
    );

    if (!picking.length)
      return res.status(404).json({ success: false, message: "Picking not found" });

    if (picking[0].state === "done")
      return res.status(400).json({ success: false, message: "Already received" });

    if (picking[0].picking_type_code !== "incoming")
      return res.status(400).json({ success: false, message: "Not a supplier receipt" });

    // Set qty_done on all move lines
    const moveLines = await odooRequest(
      "stock.move.line",
      "search_read",
      [[["picking_id", "=", id]]],
      { fields: ["id", "product_uom_qty"] }
    );

    for (const ml of moveLines) {
      await odooRequest("stock.move.line", "write", [
        [ml.id],
        { qty_done: ml.product_uom_qty },
      ]);
    }

    await odooRequest("stock.picking", "button_validate", [[id]]);

    return res.json({
      success: true,
      message: "Goods received. Stock updated by Odoo.",
      pickingId: id,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Get Purchase Orders ──────────────────────────────────────────────────────
export const getPurchaseOrders = async (req: Request, res: Response) => {
  try {
    const { supplierId, state } = req.query;
    const domain: any[] = [];
    if (supplierId) domain.push(["partner_id", "=", Number(supplierId)]);
    if (state) domain.push(["state", "=", state]);

    const orders = await odooRequest(
      "purchase.order",
      "search_read",
      [domain],
      {
        fields: ["id", "name", "partner_id", "state", "amount_total", "date_order", "picking_ids", "notes"],
        order: "date_order desc",
        limit: 50,
      }
    );

    const orderIds = orders.map((o: any) => o.id);
    const lines = orderIds.length
      ? await odooRequest(
          "purchase.order.line",
          "search_read",
          [[["order_id", "in", orderIds]]],
          {
            fields: ["order_id", "product_id", "product_qty", "qty_received", "price_unit", "price_subtotal"],
          }
        )
      : [];

    const linesByOrder: Record<number, any[]> = {};
    lines.forEach((l: any) => {
      const oid = l.order_id?.[0];
      if (!linesByOrder[oid]) linesByOrder[oid] = [];
      linesByOrder[oid].push({
        productId: l.product_id?.[0],
        productName: l.product_id?.[1],
        orderedQty: l.product_qty,
        receivedQty: l.qty_received,
        unitPrice: l.price_unit,
        subtotal: l.price_subtotal,
      });
    });

    const result = orders.map((o: any) => ({
      id: o.id,
      name: o.name,
      supplier: o.partner_id?.[1],
      supplierId: o.partner_id?.[0],
      state: o.state,
      total: o.amount_total,
      date: o.date_order,
      notes: o.notes,
      pickingIds: o.picking_ids ?? [],
      lines: linesByOrder[o.id] ?? [],
    }));

    return res.json({ success: true, purchaseOrders: result });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};