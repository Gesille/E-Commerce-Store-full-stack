import { odooRequest } from "../odoo/odoo.client.js";
import path from "path";
import { fileURLToPath } from "url";
import ejs from "ejs";

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

export type ReceiptState = "paid" | "done" | "invoiced" | "cancel";

export interface ReceiptListParams {
  page?: number;
  limit?: number;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  state?: ReceiptState;
}

export interface ReceiptListResult {
  receipts: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─────────────────────────────────────────────────────────
// List
// ─────────────────────────────────────────────────────────

export async function getReceiptsService(
  params: ReceiptListParams
): Promise<ReceiptListResult> {
  const {
    page = 1,
    limit = 20,
    search = "",
    dateFrom,
    dateTo,
    state,
  } = params;

  const domain: any[] = [
    ["state", "in", ["paid", "done", "invoiced"]],
  ];

  if (search.trim()) {
    domain.push(
      "|",
      "|",
      ["name", "ilike", search],
      ["pos_reference", "ilike", search],
      ["partner_id.name", "ilike", search]
    );
  }

  if (dateFrom) domain.push(["date_order", ">=", dateFrom]);
  if (dateTo)   domain.push(["date_order", "<=", dateTo]);
  if (state)    domain.push(["state", "=", state]);

  const [receipts, total] = await Promise.all([
    odooRequest("pos.order", "search_read", [domain], {
      fields: [
        "id", "name", "pos_reference", "date_order",
        "partner_id", "user_id", "config_id", "session_id",
        "amount_total", "amount_tax", "amount_paid", "amount_return",
        "state", "payment_ids",
      ],
      limit,
      offset: (page - 1) * limit,
      order: "date_order desc",
    }),
    odooRequest("pos.order", "search_count", [domain]),
  ]);

  return { receipts, total, page, limit, totalPages: Math.ceil(total / limit) };
}

// ─────────────────────────────────────────────────────────
// Single receipt
// ─────────────────────────────────────────────────────────

export async function getReceiptByIdService(id: number) {
  const [order] = await odooRequest("pos.order", "read", [[id]], {
    fields: [
      "id", "name", "pos_reference", "date_order",
      "partner_id", "user_id", "config_id", "session_id",
      "amount_total", "amount_tax", "amount_paid", "amount_return",
      "state", "lines", "payment_ids",
    ],
  });

  if (!order) throw new Error("Receipt not found");

  const [lines, payments] = await Promise.all([
    order.lines?.length
      ? odooRequest("pos.order.line", "read", [order.lines], {
          fields: [
            "id", "product_id", "qty", "price_unit",
            "price_subtotal", "price_subtotal_incl",
            "discount", "tax_ids", "note",
          ],
        })
      : [],
    order.payment_ids?.length
      ? odooRequest("pos.payment", "read", [order.payment_ids], {
          fields: ["id", "payment_method_id", "amount", "payment_date"],
        })
      : [],
  ]);

  return { order, lines, payments };
}

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ─────────────────────────────────────────────────────────
// Send Receipt by Email
// ─────────────────────────────────────────────────────────

export async function sendReceiptByEmailService(
  orderId: number,
  email: string
): Promise<void> {

  // 1. Fetch order
  const orders = await odooRequest(
    "pos.order",
    "search_read",
    [[["id", "=", orderId]]],
    {
      fields: [
        "name", "pos_reference",
        "amount_total", "amount_tax", "amount_paid", "amount_return",
        "date_order", "user_id", "partner_id",
        "config_id", "session_id",
      ],
      limit: 1,
    }
  );
  if (!orders?.length) throw new Error("Order not found");
  const order = orders[0];

  // 2. Fetch lines
  const lines = await odooRequest(
    "pos.order.line",
    "search_read",
    [[["order_id", "=", orderId]]],
    {
      fields: [
        "product_id", "qty", "price_unit",
        "price_subtotal_incl", "discount",
      ],
    }
  );

  // 3. Fetch payments
  const payments = await odooRequest(
    "pos.payment",
    "search_read",
    [[["pos_order_id", "=", orderId]]],
    { fields: ["payment_method_id", "amount"] }
  );

  // 4. Fetch partner details for Bill To block (address, ABST, etc.)
  let customerAddress = "";
  let customerAbst    = "";
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
          "name", "street", "street2", "city",
          "state_id", "zip", "country_id",
          "vat",           // ABST / tax number
        ],
      }
    );

    if (partners?.length) {
      const p = partners[0];
      const addrParts = [
        p.street,
        p.street2,
        p.city,
        p.state_id?.[1],
        p.zip,
        p.country_id?.[1],
      ].filter(Boolean);
      customerAddress = addrParts.join(", ");
      customerAbst    = p.vat ?? "";
    }
  }

  // 5. Compute amounts
  const subtotal = order.amount_total - order.amount_tax;
  const change   = order.amount_paid - order.amount_total > 0
    ? order.amount_paid - order.amount_total
    : 0;
  const paymentMethod = payments?.[0]?.payment_method_id?.[1] ?? "Cash";

  // 6. Build template data
  const templateData = {
    // ── Shop info ──────────────────────────────────────
    shopName:    process.env.SHOP_NAME     ?? "Chef's World",
    shopTagline: process.env.SHOP_TAGLINE  ?? "Restaurant, Bar & Kitchen Supplies",
    shopAddress: process.env.SHOP_ADDRESS  ?? "St. John's, Antigua",
    shopPhone:   process.env.SHOP_PHONE    ?? "560-2433",
    shopFax:     process.env.SHOP_FAX      ?? "560-2433",
    shopEmail:   process.env.SHOP_EMAIL    ?? "",
    shopAbst:    process.env.SHOP_ABST     ?? "0161466",
    logoUrl:     process.env.SHOP_LOGO_URL ?? "",
    ticketUrl:   process.env.ODOO_TICKET_URL
      ? `${process.env.ODOO_TICKET_URL}`
      : null,

    // ── Order header ───────────────────────────────────
    orderName:    order.name,
    posReference: order.pos_reference ?? "",
    dateOrder: new Date(order.date_order).toLocaleString("en-US", {
      month:  "2-digit",
      day:    "2-digit",
      year:   "numeric",
      hour:   "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
    servedBy:  order.user_id?.[1]    ?? "Staff",
    orderType: "Dine In",
    sessionId: order.session_id?.[1] ?? "",
    configId:  order.config_id?.[1]  ?? "",

    // ── Bill To ────────────────────────────────────────
    customerName:    order.partner_id ? order.partner_id[1] : null,
    customerAddress,
    customerAbst,

    // ── PO / Terms (extend env vars or pass from caller) ─
    poNumber:     process.env.DEFAULT_PO_NUMBER    ?? "",
    paymentTerms: process.env.DEFAULT_PAYMENT_TERMS ?? "Net 30",
    project:      process.env.DEFAULT_PROJECT       ?? "",

    // ── Line items ─────────────────────────────────────
    lines: lines.map((l: any) => ({
      qty:        l.qty,
      name:       l.product_id[1],
      priceUnit:  Number(l.price_unit),
      priceTotal: Number(l.price_subtotal_incl),
      discount:   Number(l.discount) || 0,
    })),

    // ── Totals ─────────────────────────────────────────
    subtotal:     Number(subtotal),
    tax:          Number(order.amount_tax),
    total:        Number(order.amount_total),
    amountPaid:   Number(order.amount_paid),
    change:       Number(change),
    paymentMethod,
  };

  // 7. Render EJS template
  const templatePath = path.join(__dirname, "../mails/receiptEmail.ejs");
  const htmlBody     = await ejs.renderFile(templatePath, templateData);

  // 8. Create mail record in Odoo
  const mailId = await odooRequest(
    "mail.mail",
    "create",
    [
      {
        subject:     `Your Receipt - ${order.name}`,
        body_html:   htmlBody,
        email_to:    email,
        auto_delete: true,
      },
    ],
    {}
  );

  // 9. Send
  await odooRequest("mail.mail", "send", [[mailId]], {});
}