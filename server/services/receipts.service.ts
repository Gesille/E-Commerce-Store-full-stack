import { odooRequest } from "../odoo/odoo.client.js";
import path from "path";
import ejs from "ejs";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export async function sendReceiptByEmailService(
  orderId: number,
  email: string
): Promise<void> {
  try {
    // ─────────────────────────────────────────
    // 1. Fetch order
    // ─────────────────────────────────────────
    const orders = await odooRequest(
      "pos.order",
      "search_read",
      [[["id", "=", orderId]]],
      {
        fields: [
          "name",
          "pos_reference",
          "amount_total",
          "amount_tax",
          "amount_paid",
          "amount_return",
          "date_order",
          "user_id",
          "partner_id",
          "config_id",
          "session_id",
        ],
        limit: 1,
      }
    );

    if (!orders?.length) {
      throw new Error("Order not found");
    }

    const order = orders[0];

    // ─────────────────────────────────────────
    // 2. Fetch order lines
    // ─────────────────────────────────────────
    const lines = await odooRequest(
      "pos.order.line",
      "search_read",
      [[["order_id", "=", orderId]]],
      {
        fields: [
          "product_id",
          "qty",
          "price_unit",
          "price_subtotal_incl",
          "discount",
        ],
      }
    );

    // ─────────────────────────────────────────
    // 3. Fetch payments
    // ─────────────────────────────────────────
    const payments = await odooRequest(
      "pos.payment",
      "search_read",
      [[["pos_order_id", "=", orderId]]],
      {
        fields: ["payment_method_id", "amount"],
      }
    );

    // ─────────────────────────────────────────
    // 4. Customer info
    // ─────────────────────────────────────────
    let customerAddress = "";
    let customerAbst = "";

    if (order.partner_id) {
      const partnerId = Array.isArray(order.partner_id)
        ? order.partner_id[0]
        : order.partner_id;

      const partners = await odooRequest(
        "res.partner",
        "read",
        [[partnerId]],
        {
          fields: [
            "name",
            "street",
            "street2",
            "city",
            "state_id",
            "zip",
            "country_id",
            "vat",
          ],
        }
      );

      if (partners?.length) {
        const p = partners[0];

        const addressParts = [
          p.street,
          p.street2,
          p.city,
          p.state_id?.[1],
          p.zip,
          p.country_id?.[1],
        ].filter(Boolean);

        customerAddress = addressParts.join(", ");
        customerAbst = p.vat ?? "";
      }
    }

    // ─────────────────────────────────────────
    // 5. Calculations
    // ─────────────────────────────────────────
    const subtotal =
      Number(order.amount_total) - Number(order.amount_tax);

    const change =
      Number(order.amount_paid) > Number(order.amount_total)
        ? Number(order.amount_paid) -
          Number(order.amount_total)
        : 0;

    const paymentMethod =
      payments?.[0]?.payment_method_id?.[1] ?? "Cash";

    // ─────────────────────────────────────────
    // 6. Template data for EJS
    // ─────────────────────────────────────────
    const templateData = {
      // Shop Info
      shopName:
        process.env.SHOP_NAME ?? "Chef's World",

      shopTagline:
        process.env.SHOP_TAGLINE ??
        "Restaurant, Bar & Kitchen Supplies",

      shopAddress:
        process.env.SHOP_ADDRESS ??
        "St. John's, Antigua",

      shopPhone:
        process.env.SHOP_PHONE ?? "560-2433",

      shopFax:
        process.env.SHOP_FAX ?? "560-2433",

      shopEmail:
        process.env.SHOP_EMAIL ?? "",

      shopAbst:
        process.env.SHOP_ABST ?? "0161466",

      logoUrl:
        process.env.SHOP_LOGO_URL ?? "",

      ticketUrl: process.env.ODOO_TICKET_URL
        ? `${process.env.ODOO_TICKET_URL}/${orderId}`
        : null,

      // Header
      orderName: order.name,

      posReference:
        order.pos_reference ?? "",

      dateOrder: new Date(
        order.date_order
      ).toLocaleString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),

      servedBy:
        order.user_id?.[1] ?? "Staff",

      orderType: "In Store",

      sessionId:
        order.session_id?.[1] ?? "",

      configId:
        order.config_id?.[1] ?? "",

      // Customer
      customerName: order.partner_id
        ? order.partner_id[1]
        : null,

      customerAddress,
      customerAbst,

      // PO / Terms
      poNumber:
        process.env.DEFAULT_PO_NUMBER ?? "",

      paymentTerms:
        process.env.DEFAULT_PAYMENT_TERMS ??
        "Net 30",

      project:
        process.env.DEFAULT_PROJECT ?? "",

      // Items
      lines: lines.map((line: any) => ({
        qty: Number(line.qty),

        name:
          line.product_id?.[1] ??
          "Unnamed Product",

        priceUnit: Number(line.price_unit),

        priceTotal: Number(
          line.price_subtotal_incl
        ),

        discount:
          Number(line.discount) || 0,
      })),

      // Totals
      subtotal: Number(subtotal),
      tax: Number(order.amount_tax),
      total: Number(order.amount_total),
      amountPaid: Number(order.amount_paid),
      change: Number(change),
      paymentMethod,
    };

    // ─────────────────────────────────────────
    // 7. Render EJS
    // ─────────────────────────────────────────
    const templatePath = path.join(
      __dirname,
      "../mails/receiptEmail.ejs"
    );
console.log("EJS PATH:", templatePath);
    const htmlBody = await ejs.renderFile(
      templatePath,
      templateData
    );
console.log(htmlBody.substring(0, 1000));
    // ─────────────────────────────────────────
    // 8. Create email in Odoo
    // ─────────────────────────────────────────
    const mailId = await odooRequest(
      "mail.mail",
      "create",
      [
        {
          subject: `Receipt - ${order.name}`,
          body_html: htmlBody,
          email_to: email,
          auto_delete: true,
        },
      ],
      {}
    );

    // ─────────────────────────────────────────
    // 9. Send email
    // ─────────────────────────────────────────
    await odooRequest(
      "mail.mail",
      "send",
      [[mailId]],
      {}
    );
  } catch (error: any) {
    console.error(
      "Send receipt email error:",
      error
    );

    throw new Error(
      error?.message ||
        "Failed to send receipt email"
    );
  }
}