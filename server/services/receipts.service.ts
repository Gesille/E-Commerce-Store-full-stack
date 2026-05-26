import { odooRequest } from "../odoo/odoo.client.js";

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

export async function sendReceiptByEmailService(
  orderId: number,
  email: string
): Promise<void> {

  const orders = await odooRequest(
    "pos.order",
    "search_read",
    [[["id", "=", orderId]]],
    { fields: ["name", "amount_total"], limit: 1 }
  );

  if (!orders || orders.length === 0) {
    throw new Error("Order not found");
  }

  const order = orders[0];

  const pdfBase64 = await odooRequest(
    "pos.order",
    "action_receipt_to_mail",
    [[orderId]],
    {}
  );

  const mailId = await odooRequest(
    "mail.mail",
    "create",
    [
      {
        subject: `Your Receipt - ${order.name}`,
        body_html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px;">
            <h3>Thank you for your purchase!</h3>
            <p>Order: <strong>${order.name}</strong></p>
            <p>Total: <strong>$${Number(order.amount_total).toFixed(2)}</strong></p>
            <p>Please find your receipt attached.</p>
          </div>
        `,
        email_to: email,
        auto_delete: true,
        ...(pdfBase64 && {
          attachment_ids: [
            [
              0,
              0,
              {
                name: `receipt-${order.name}.pdf`,
                datas: pdfBase64,
                mimetype: "application/pdf",
              },
            ],
          ],
        }),
      },
    ],
    {}
  );

 
  await odooRequest("mail.mail", "send", [[mailId]], {});
}