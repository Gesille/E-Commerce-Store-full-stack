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

  // ── Search ─────────────────────────────────────────────
  // FIX: Odoo OR syntax requires each "|" immediately before its two operands.
  // For 3 conditions: ["|", "|", cond1, cond2, cond3]
  if (search.trim()) {
    domain.push(
      "|",
      "|",
      ["name", "ilike", search],
      ["pos_reference", "ilike", search],
      ["partner_id.name", "ilike", search]
    );
  }

  // ── Date range ─────────────────────────────────────────
  if (dateFrom) {
    domain.push(["date_order", ">=", dateFrom]);
  }

  if (dateTo) {
    domain.push(["date_order", "<=", dateTo]);
  }

  // ── State override ─────────────────────────────────────
  // Only apply if user specifically requested a single state
  // (the base domain already filters to paid/done/invoiced)
  if (state) {
    domain.push(["state", "=", state]);
  }

  const [receipts, total] = await Promise.all([
    odooRequest("pos.order", "search_read", [domain], {
      fields: [
        "id",
        "name",
        "pos_reference",
        "date_order",
        "partner_id",
        "user_id",
        "config_id",
        "session_id",
        "amount_total",
        "amount_tax",
        "amount_paid",
        "amount_return",
        "state",
        "payment_ids",
      ],
      limit,
      offset: (page - 1) * limit,
      order: "date_order desc",
    }),

    odooRequest("pos.order", "search_count", [domain]),
  ]);

  return {
    receipts,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

// ─────────────────────────────────────────────────────────
// Single receipt
// ─────────────────────────────────────────────────────────

export async function getReceiptByIdService(id: number) {
  const [order] = await odooRequest("pos.order", "read", [[id]], {
    fields: [
      "id",
      "name",
      "pos_reference",
      "date_order",
      "partner_id",
      "user_id",
      "config_id",
      "session_id",
      "amount_total",
      "amount_tax",
      "amount_paid",
      "amount_return",
      "state",
      "lines",
      "payment_ids",
    ],
  });

  if (!order) {
    throw new Error("Receipt not found");
  }

  const [lines, payments] = await Promise.all([
    order.lines?.length
      ? odooRequest("pos.order.line", "read", [order.lines], {
          fields: [
            "id",
            "product_id",
            "qty",
            "price_unit",
            "price_subtotal",
            "price_subtotal_incl",
            "discount",
            "tax_ids",
            "note",
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
const __dirname = path.dirname(__filename);



// ─────────────────────────────────────────────────────────
// Send Receipt by Email
// ─────────────────────────────────────────────────────────
export async function sendReceiptByEmailService(
  orderId: number,
  email: string
): Promise<void> {

  
  const orders = await odooRequest(
    "pos.order",
    "search_read",
    [[["id", "=", orderId]]],
    {
      fields: [
        "name",
        "amount_total",
        "amount_tax",
        "amount_paid",
        "amount_return",
        "date_order",
        "user_id",
        "partner_id",
      ],
      limit: 1,
    }
  );

  if (!orders?.length) throw new Error("Order not found");
  const order = orders[0];


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


  const payments = await odooRequest(
    "pos.payment",
    "search_read",
    [[["pos_order_id", "=", orderId]]],
    { fields: ["payment_method_id", "amount"] }
  );

const subtotal = order.amount_total - order.amount_tax;
const change =
  order.amount_paid - order.amount_total > 0
    ? order.amount_paid - order.amount_total
    : 0;

const templateData = {
  // ── Receipt identity ──
  receiptNo: `RCP-${String(orderId).slice(-6)}`,
  date: new Date(order.date_order).toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }),
  odooOrderId: orderId,
  customerName: order.partner_id ? order.partner_id[1] : null,

  // ── Lines ──
  lines: lines.map((l: any) => ({
    qty: l.qty,
    name: l.product_id[1],
    priceUnit: Number(l.price_unit),
    priceTotal: Number(l.price_subtotal_incl),
    discount: Number(l.discount) || 0,
  })),

  // ── Totals ──
  subtotal: Number(subtotal),
  tax: Number(order.amount_tax),
  total: Number(order.amount_total),
  paymentLines: payments.map((p: any) => ({
    method: p.payment_method_id?.[1] ?? "Cash",
    amount: Number(p.amount),
  })),
  change: Number(change),

  // ── Shop ──
  shopName:    process.env.SHOP_NAME    ?? "Chef's World",
  shopTagline: process.env.SHOP_TAGLINE ?? "Restaurant, Bar & Kitchen Supplies",
  shopAddress: process.env.SHOP_ADDRESS ?? "Epicurean Drive, Saint John",
  shopPhone:   process.env.SHOP_PHONE   ?? "560-2433",
  shopABST:    process.env.SHOP_ABST    ?? "0161466",
  shopEmail:   process.env.SHOP_EMAIL   ?? "",
  logoUrl:     process.env.SHOP_LOGO_URL ?? "",
   policyUrl:
    process.env.CLIENT_URL + "/policy",
};

  
  const templatePath = path.join(__dirname, "../mails/receiptEmail.ejs");
  const htmlBody = await ejs.renderFile(templatePath, templateData);

  const mailId = await odooRequest(
    "mail.mail",
    "create",
    [
      {
        subject: `Your Receipt - ${order.name}`,
        body_html: htmlBody,
        email_to: email,
        auto_delete: true,
      },
    ],
    {}
  );


  await odooRequest("mail.mail", "send", [[mailId]], {});
}