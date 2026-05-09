import { NextFunction, Request, Response } from "express";
import { odooRequest } from "../odoo/odoo.client.js";
import ErrorHandler from "../utils/ErrorHandler.js";
import sendMail from "../utils/sendMail.js";
import Order from "../models/order.model.js";
import dotenv from "dotenv";
import { CatchAsyncError } from "../middleware/catchAsyncError.js";
dotenv.config();

import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import userModel from "../models/user.model.js";

export const createOrder = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { items, shippingAddress } = req.body;
    const user = req.user;

    if (!items?.length) return next(new ErrorHandler("Cart is empty", 400));

    let total = 0;
    for (const item of items) {
      total += item.price * item.quantity;
    }

    const order = await Order.create({
      userId: user?._id,
      odooPartnerId: user?.odooPartnerId,
      items,
      shippingAddress,
      total,
      status: "pending",
      
    });

    await userModel.findByIdAndUpdate(user?._id, {
      $push: { orders: order._id },
    });

    const baseUrl = process.env.BACKEND_URL?.replace(/\/$/, "");

    const confirmUrl = `${baseUrl}/api/v1/manager-confirm/${order._id}`;
    const cancelUrl = `${baseUrl}/api/v1/manager-cancel/${order._id}`;
// After creating the order, fetch product names from Odoo
const itemsWithNames = await Promise.all(
  order.items.map(async (item: any) => {
    const product = await odooRequest(
      "product.template",
      "search_read",
      [[["id", "=", item.productId]]],
      { fields: ["name","default_code"], limit: 1 }
    );
    return {
      ...item.toObject(),
      name: product[0]?.name || `Product #${item.productId}`,
      reference: product[0]?.default_code || null,
    };
  })
);

    await sendMail({
      email: process.env.MANAGER_EMAIL!,
      subject: `🔔 New Order #${order._id}`,
      template: "manager-order.ejs",
       data: {
    order: {
      ...order.toObject(),
      date: new Date().toLocaleDateString(),
      customerName: user?.name,
      customerEmail: user?.email,
      items:itemsWithNames, 
      total: order.total,
    },
    confirmUrl,
    cancelUrl,
  },
    });

    res.status(201).json({
      success: true,
      message: "Order saved in MongoDB. Waiting for manager approval.",
      order,
    });
  },
);

// ===============================
// ✅ MANAGER CONFIRM → ODOO
// ===============================
export const managerConfirmOrder = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user?.role;

    if (userRole !== "user" && userRole !== "admin") {
      return next(new ErrorHandler("Not authorized", 403));
    }

    const user = req.user;

if (!user) {
  return next(new ErrorHandler("Not authenticated", 401));
}
    const { orderId } = req.params;

    const order = await Order.findById(orderId);

    if (!order) return next(new ErrorHandler("Order not found", 404));

    if (order.status !== "pending") {
      return res.send(`<h2>Already ${order.status}</h2>`);
    }

    try {
      // 1. Create Sale Order
      const saleOrderId = await odooRequest("sale.order", "create", [
        {
          partner_id: Number(order.odooPartnerId),
          origin: `WEB_ORDER_${order._id}`,
        },
      ]);

      // 2. Add Products
      for (const item of order.items) {
        // 🔥 Get correct variant
        const variant = await odooRequest(
          "product.product",
          "search_read",
          [[["product_tmpl_id", "=", item.productId]]],
          { fields: ["id", "qty_available"], limit: 1 },
        );

        const product = variant[0];

        if (!product)
          throw new Error(`Product not found in Odoo: ${item.productId}`);

        if (product.qty_available < item.quantity) {
          throw new Error(`Not enough stock for product ${item.productId}`);
        }

        await odooRequest("sale.order.line", "create", [
          {
            order_id: saleOrderId,
            product_id: product.id,
            product_uom_qty: item.quantity,
            price_unit: item.price,
          },
        ]);
      }

      // 3. Confirm Sale Order
      await odooRequest("sale.order", "action_confirm", [[saleOrderId]]);

      const pickings = await odooRequest(
        "stock.picking",
        "search_read",
        [[["sale_id", "=", saleOrderId]]],
        { fields: ["id", "state"] },
      );

      if (pickings.length > 0) {
        const pickingId = pickings[0].id;

        // ✅ make sure it's assigned
        await odooRequest("stock.picking", "action_assign", [[pickingId]]);

        let moves = await odooRequest(
          "stock.move",
          "search_read",
          [[["picking_id", "=", pickingId]]],
          {
            fields: [
              "id",
              "product_id",
              "product_uom_qty",

              "location_id",
              "location_dest_id",
            ],
          },
        );

        const existingLines = await odooRequest(
          "stock.move.line",
          "search_read",
          [[["picking_id", "=", pickingId]]],
          { fields: ["id", "quantity"] },
        );

        if (existingLines.length === 0) {
          for (const move of moves) {
            await odooRequest("stock.move.line", "create", [
              {
                move_id: move.id,
                picking_id: pickingId,
                product_id: move.product_id[0],
                location_id: move.location_id[0],
                location_dest_id: move.location_dest_id[0],
                qty_done: move.product_uom_qty,
              },
            ]);
          }
        } else {
          for (const line of existingLines) {
            await odooRequest("stock.move.line", "write", [
              [line.id],
              { qty_done: line.quantity },
            ]);
          }
        }

        await odooRequest("stock.picking", "button_validate", [[pickingId]]);
      }
      // 5. Update Mongo
      order.status = "confirmed";
      order.odooSaleOrderId = saleOrderId;
      await order.save();

      // 6. Email user
      const user = await userModel.findById(order.userId);

    // Before sendMail to client
const itemsWithNames = await Promise.all(
  order.items.map(async (item: any) => {
    const product = await odooRequest(
      "product.template",
      "search_read",
      [[["id", "=", item.productId]]],
      { fields: ["name","default_code"], limit: 1 }
    );
    return {
      ...item.toObject(),
      name: product[0]?.name || `Product #${item.productId}`,
      reference: product[0]?.default_code || null,
    };
  })
);

await sendMail({
  email: user?.email!,
  subject: "✅ Order Confirmed",
  template: "order-confirmed-client.ejs",
  data: {
    order: {
      ...order.toObject(),
      date: new Date().toLocaleDateString(),
      items: itemsWithNames, // ✅ items now have name
    },
  },
});

      return res.send(`
        <div style="text-align:center;padding:40px">
          <h1 style="color:green">Order Confirmed</h1>
          <p>#${order._id}</p>
        </div>
      `);
    } catch (error: any) {
      return next(new ErrorHandler(`Odoo Sync Failed: ${error.message}`, 500));
    }
  },
);

export const managerCancelOrder = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    // 🔐 logged-in manager/admin
    const manager = req.user;

    if (!manager) {
      return next(new ErrorHandler("Not authenticated", 401));
    }

    const { orderId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) {
      return next(new ErrorHandler("Order not found", 404));
    }

    // ❌ FIXED STATUS CHECK
    if (order.status !== "pending") {
      return res.send(`<h2>Already ${order.status}</h2>`);
    }

    // 👤 customer who placed order
    const customer = await userModel.findById(order.userId);
    if (!customer) {
      return next(new ErrorHandler("Customer not found", 404));
    }

    // 🧾 fetch product names from Odoo
    const itemsWithNames = await Promise.all(
      order.items.map(async (item: any) => {
        const product = await odooRequest(
          "product.template",
          "search_read",
          [[["id", "=", item.productId]]],
          { fields: ["name"], limit: 1 }
        );

        return {
          ...item.toObject(),
          name: product[0]?.name || `Product #${item.productId}`,
        };
      })
    );

    // 📧 send email BEFORE deleting
    await sendMail({
      email: customer.email,
      subject: "❌ Your Order Has Been Cancelled",
      template: "order-cancelled-client.ejs",
      data: {
        order: {
          ...order.toObject(),
          date: new Date().toLocaleDateString(),
          items: itemsWithNames,
        },
      },
    });

    // 🗑 remove order from user
    await userModel.findByIdAndUpdate(order.userId, {
      $pull: { orders: order._id },
    });

    // 🗑 delete order
    await Order.findByIdAndDelete(orderId);

    return res.send(`
      <div style="font-family:sans-serif;text-align:center;padding:60px;background:#fef2f2;min-height:100vh">
        <div style="font-size:56px">❌</div>
        <h1 style="color:#dc2626">Order Rejected</h1>
        <p style="color:#4b5563">
          Order <strong>#${orderId}</strong> has been deleted and the customer has been notified.
        </p>
      </div>
    `);
  }
);


// return product 
export const returnOrderItems = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    console.log("📥 RETURN REQUEST BODY:", req.body);

    const { orderId, itemsToReturn } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      console.log("❌ Order not found");
      return next(new ErrorHandler("Order not found", 404));
    }

    const saleOrderId = order.odooSaleOrderId;
    console.log("🧾 Sale Order ID:", saleOrderId);

    // 1. GET DELIVERY PICKING
    const pickings = await odooRequest(
      "stock.picking",
      "search_read",
      [[["sale_id", "=", saleOrderId]]],
      { fields: ["id", "name"] }
    );

    console.log("📦 Pickings found:", pickings);

    const pickingId = pickings?.[0]?.id;

    if (!pickingId) {
      console.log("❌ No picking found");
      return next(new ErrorHandler("No delivery found", 400));
    }

    console.log("📦 Picking ID:", pickingId);

    // 2. CREATE RETURN WIZARD
    const returnWizardId = await odooRequest(
      "stock.return.picking",
      "create",
      [{ picking_id: pickingId }]
    );

    console.log("🔄 Return Wizard ID:", returnWizardId);

    // 3. GET RETURN LINES
    const lines = await odooRequest(
      "stock.return.picking.line",
      "search_read",
      [[["wizard_id", "=", returnWizardId]]],
      {
        fields: ["id", "product_id", "quantity"],
      }
    );

    console.log("📦 Raw return lines:", lines);

    // 4. ENRICH LINES WITH PRODUCT NAMES
    const enrichedLines = await Promise.all(
      lines.map(async (line: any) => {
        const product = await odooRequest(
          "product.product",
          "search_read",
          [[["id", "=", line.product_id[0]]]],
          { fields: ["id", "name"], limit: 1 }
        );

        const name = product?.[0]?.name;

        console.log("🔎 Product resolved:", {
          productId: line.product_id[0],
          name,
        });

        return {
          ...line,
          productName: name,
        };
      })
    );

    // 5. MATCH BY NAME (YOUR REQUEST)
    for (const item of itemsToReturn) {
      console.log("🔁 Trying to return item:", item);

      const line = enrichedLines.find(
        (l: any) =>
          l.productName?.toLowerCase() === item.productName?.toLowerCase()
      );

      if (!line) {
        console.log("⚠️ No matching line for:", item.productName);
        continue;
      }

      console.log("✅ Matching line found:", line.id);

      await odooRequest("stock.return.picking.line", "write", [
        [line.id],
        { quantity: item.quantity },
      ]);
    }

    // 6. FINAL RETURN CALL (CORRECT METHOD)
    console.log("🚀 Calling action_create_returns...");

    const result = await odooRequest(
      "stock.return.picking",
      "action_create_returns",
      [[returnWizardId]]
    );

    console.log("✅ RETURN RESULT:", result);

    return res.json({
      success: true,
      message: "Return processed successfully",
      debug: {
        pickingId,
        returnWizardId,
        lines: enrichedLines.map((l) => ({
          name: l.productName,
          quantity: l.quantity,
        })),
      },
    });
  }
);
// controllers/order.controller.ts — add this function
export const getAdminOrders = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orders = await odooRequest(
        "sale.order",
        "search_read",
        [[]], // all orders
        {
          fields: [
            "name",           // S00051
            "date_order",     // May 3, 2:49 PM
            "partner_id",     // Giselle Georges
            "amount_total",   // 1.15$
            "state",          // draft/sale/done/cancel
            "user_id",        // salesperson
            "origin",         // WEB_ORDER_xxx if from your store
          ],
          limit: 100,
          order: "date_order desc",
        }
      );

      res.status(200).json({ success: true, orders });
    } catch (error: any) {
      return next(new ErrorHandler(`Odoo error: ${error.message}`, 500));
    }
  }
);
// controllers/order.controller.ts — add this
export const getAdminOrderDetail = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      // 1️⃣ get the sale order
      const orders = await odooRequest(
        "sale.order",
        "search_read",
        [[["id", "=", Number(id)]]],
        {
          fields: [
            "name", "date_order", "partner_id", "amount_total",
            "amount_tax", "amount_untaxed", "state", "user_id",
            "origin", "note", "order_line",
          ],
          limit: 1,
        }
      );

      if (!orders.length) {
        return next(new ErrorHandler("Order not found", 404));
      }

      const order = orders[0];

      const lines = await odooRequest(
        "sale.order.line",
        "search_read",
        [[["order_id", "=", Number(id)]]],
        {
          fields: [
            "product_id",       
            "name",            
            "product_uom_qty", 
            "price_unit",    
            "price_subtotal",  
                   
          ],
        }
      );

      res.status(200).json({
        success: true,
        order: { ...order, lines },
      });
    } catch (error: any) {
      return next(new ErrorHandler(`Odoo error: ${error.message}`, 500));
    }
  }
);
// track order
export const trackOrder = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);

    if (!order) {
      return next(new ErrorHandler("Order not found", 404));
    }

    if (!order.odooSaleOrderId) {
      return res.json({
        success: true,
        status: order.status,
      });
    }

    // 1. sale.order state
    const sale = await odooRequest(
      "sale.order",
      "search_read",
      [[["id", "=", order.odooSaleOrderId]]],
      { fields: ["state"] },
    );

    const state = sale[0]?.state;

    // 2. stock.picking state (REAL DELIVERY)
    const picking = await odooRequest(
      "stock.picking",
      "search_read",
      [[["origin", "=", `WEB_ORDER_${order._id}`]]],
      { fields: ["state"] },
    );

    const pickingState = picking[0]?.state;

    // 3. mapping
    let newStatus = order.status;

    if (state === "draft") newStatus = "pending";
    if (state === "sale") newStatus = "confirmed";

    if (pickingState === "assigned") newStatus = "processing";
    if (pickingState === "done") newStatus = "done";
    if (state === "cancel") newStatus = "cancelled";

    order.status = newStatus;
    await order.save();

    res.json({
      success: true,
      mongoStatus: order.status,
      odooSaleState: state,
      odooPickingState: pickingState,
    });
  },
);

// get inventory
export const getInventoryReport = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const products = await odooRequest(
      "product.template",
      "search_read",
      [[]],
      {
        fields: [
          "name",
          "default_code",
          "qty_available",
          "virtual_available",
          "list_price",
          "standard_price",
        ],
      },
    );

    res.json({
      success: true,
      count: products.length,
      inventory: products,
    });
  } catch (error: any) {
    return next(new ErrorHandler(error.message, 500));
  }
};

export const exportInventory = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { format } = req.query;

    const data = await odooRequest("product.template", "search_read", [[]], {
      fields: ["default_code", "name", "qty_available", "list_price"],
    });

    const fileName = `Inventory_Report_${new Date().toISOString().split("T")[0]}`;

    if (format === "pdf") {
      try {
      
        const DocClass = (jsPDF as any).default || jsPDF;
        const doc = new DocClass();

        doc.setFontSize(18);
        doc.text("Inventory Stock Report", 14, 22);

        const tableColumn = ["Product Name", "SKU", "Qty", "Price"];
        const tableRows = data.map((item: any) => [
          item.name,
          item.default_code || "N/A",
          item.qty_available.toString(),
          `$${Number(item.list_price).toFixed(2)}`,
        ]);


        const applyAutoTable = (autoTable as any).default || autoTable;

        if (typeof applyAutoTable !== "function") {
         
          if (typeof (doc as any).autoTable === "function") {
            (doc as any).autoTable({
              head: [tableColumn],
              body: tableRows,
              startY: 30,
              theme: "grid",
            });
          } else {
            throw new Error("autoTable is not a function. Check your imports.");
          }
        } else {
          applyAutoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 30,
            theme: "grid",
            headStyles: { fillColor: [41, 128, 185] },
          });
        }

        const pdfArrayBuffer = doc.output("arraybuffer");
        const buffer = Buffer.from(pdfArrayBuffer);

        res.setHeader(
          "Content-Disposition",
          `attachment; filename=${fileName}.pdf`,
        );
        res.setHeader("Content-Type", "application/pdf");
        return res.send(buffer);
      } catch (pdfError: any) {
        return next(new ErrorHandler(`PDF Error: ${pdfError.message}`, 500));
      }
    }

    if (format === "excel" || !format) {
      const formattedData = data.map((item: any) => ({
        "Product Name": item.name,
        SKU: item.default_code || "N/A",
        Stock: item.qty_available,
        Price: item.list_price,
      }));

      const sheet = XLSX.utils.json_to_sheet(formattedData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, sheet, "Inventory");

      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${fileName}.xlsx`,
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      return res.send(buf);
    }
  },
);




export const getMonthlyRevenue = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Fetch all non-cancelled sale orders from Odoo
      const orders = await odooRequest(
        "sale.order",
        "search_read",
        [[["state", "!=", "cancel"]]],
        {
          fields: ["date_order", "amount_total", "state"],
         
        }
      );
      console.log("Total orders fetched:", orders.length);
      console.log("Sample order:", JSON.stringify(orders[0], null, 2));

      const monthMap: {
  [key: string]: { month: string; total: number; successful: number };
} = {};

      const monthNames = [
        "January", "February", "March", "April",
        "May", "June", "July", "August",
        "September", "October", "November", "December",
      ];

      for (const order of orders) {
        if (!order.date_order) continue;

        const date = new Date(order.date_order);
        const year = date.getFullYear();
        const monthIndex = date.getMonth(); // 0-based
        const key = `${year}-${String(monthIndex + 1).padStart(2, "0")}`; // e.g. "2024-05"

        if (!monthMap[key]) {
          monthMap[key] = {
            month: `${monthNames[monthIndex]} ${year}`,
            total: 0,
            successful: 0,
          };
        }

        monthMap[key].total += order.amount_total;

        // "sale" = confirmed, "done" = fully completed
        if (order.state === "sale" || order.state === "done") {
          monthMap[key].successful += order.amount_total;
        }
      }

      // Sort chronologically
      const chartData = Object.entries(monthMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, value]) => ({
          ...value,
          total: parseFloat(value.total.toFixed(2)),
          successful: parseFloat(value.successful.toFixed(2)),
        }));

      res.status(200).json({ success: true, chartData });
    } catch (error: any) {
      return next(new ErrorHandler(`Odoo error: ${error.message}`, 500));
    }
  }
);




// order.controller.ts
export const getOrderStatusStats = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orders = await odooRequest(
        "sale.order",
        "search_read",
        [[["state", "!=", "cancel"]]],
        { fields: ["state"] }
      );

      const counts: Record<string, number> = {};
      for (const o of orders) {
        counts[o.state] = (counts[o.state] || 0) + 1;
      }

      const statusData = Object.entries(counts).map(([state, count]) => ({
        state,
        count,
      }));

      res.status(200).json({ success: true, statusData });
    } catch (error: any) {
      return next(new ErrorHandler(`Odoo error: ${error.message}`, 500));
    }
  }
);

// order.controller.ts
export const getLatestTransactions = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orders = await odooRequest(
        "sale.order",
        "search_read",
        [[["state", "in", ["sale", "done"]]]],
        {
          fields: ["name", "partner_id", "amount_total", "date_order", "state"],
          order: "date_order desc",
          limit: 10,
        }
      );

      const transactions = orders.map((order: any) => ({
        id: order.id,
        orderRef: order.name,
        customerName: order.partner_id?.[1] || "Unknown",
        amount: parseFloat(order.amount_total.toFixed(2)),
        date: order.date_order,
        state: order.state,
      }));

      res.status(200).json({ success: true, transactions });
    } catch (error: any) {
      return next(new ErrorHandler(`Odoo error: ${error.message}`, 500));
    }
  }
);

export const managerCreateOrder = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { items, shippingAddress, email } = req.body;

    if (!email) return next(new ErrorHandler("Email is required", 400));
    if (!items?.length) return next(new ErrorHandler("Cart is empty", 400));

    const targetUser = await userModel.findOne({ email });
    if (!targetUser) return next(new ErrorHandler("Target user not found", 404));

    // 1. Validate + check stock for all items BEFORE creating the order
    const resolvedItems = await Promise.all(
      items.map(async (item: any) => {
        const product = await odooRequest(
          "product.template",
          "search_read",
          [[["default_code", "=", item.reference]]],
          { fields: ["id", "name", "default_code", "qty_available"], limit: 1 }
        );

        // 2. Check reference exists
        if (!product[0])
          return next(new ErrorHandler(`Reference "${item.reference}" not found in Odoo`, 404));

        // 3. Validate name matches
        const odooName = product[0].name?.trim().toLowerCase();
        const inputName = item.name?.trim().toLowerCase();
        if (odooName !== inputName)
          return next(
            new ErrorHandler(
              `Product name mismatch for "${item.reference}": expected "${product[0].name}", got "${item.name}"`,
              400
            )
          );

        // 4. Check sufficient stock
        if (product[0].qty_available < item.quantity)
          return next(
            new ErrorHandler(
              `Insufficient stock for "${product[0].name}": available ${product[0].qty_available}, requested ${item.quantity}`,
              400
            )
          );

        return {
          productId: product[0].id,
          name: product[0].name,
          reference: product[0].default_code,
          price: item.price,
          quantity: item.quantity,
        };
      })
    );

    const total = resolvedItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    const order = await Order.create({
      userId: targetUser._id,
      odooPartnerId: targetUser.odooPartnerId,
      items: resolvedItems,
      shippingAddress,
      total,
      status: "pending",
      createdByManager: req.user?._id,
    });

    await userModel.findByIdAndUpdate(targetUser._id, {
      $push: { orders: order._id },
    });

    // 5. Decrease stock in Odoo for each item
    for (const item of resolvedItems) {
      // Get the product.product id (variant) from product.template id
      const variant = await odooRequest(
        "product.product",
        "search_read",
        [[["product_tmpl_id", "=", item.productId]]],
        { fields: ["id"], limit: 1 }
      );

      if (variant[0]) {
        // Create an inventory adjustment (stock.quant) to decrease qty
        await odooRequest(
          "stock.quant",
          "create",
          [{
            product_id: variant[0].id,
            location_id: 8, // your Odoo stock location ID (usually 8 = Virtual Locations/WH/Stock)
            quantity: -item.quantity, // negative = decrease
          }]
        );
      }
    }

    const baseUrl = process.env.BACKEND_URL?.replace(/\/$/, "");
    const confirmUrl = `${baseUrl}/api/v1/manager-confirm/${order._id}`;
    const cancelUrl = `${baseUrl}/api/v1/manager-cancel/${order._id}`;

    const itemsWithNames = order.items.map((item: any) => item.toObject());

    await sendMail({
      email: process.env.MANAGER_EMAIL!,
      subject: `🔔 New Order #${order._id} (Created by Manager)`,
      template: "manager-order.ejs",
      data: {
        order: {
          ...order.toObject(),
          date: new Date().toLocaleDateString(),
          customerName: targetUser.name,
          customerEmail: targetUser.email,
          items: itemsWithNames,
          total,
        },
        confirmUrl,
        cancelUrl,
      },
    });

    res.status(201).json({
      success: true,
      message: "Order created on behalf of user. Waiting for approval.",
      order,
    });
  }
);