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

  // الخطوة 2: جيب PDF عبر report renderer
  let pdfBase64: string | null = null;

  try {
    const reportResult = await odooRequest(
      "ir.actions.report",
      "render_qweb_pdf",
      [["point_of_sale.report_receipt"], [orderId]],
      {}
    );

    // النتيجة تكون [pdfBytes, "pdf"] — نأخذ الأول
    pdfBase64 = Array.isArray(reportResult)
      ? Buffer.from(reportResult[0]).toString("base64")
      : null;

  } catch (reportErr) {
    console.warn("PDF generation skipped:", reportErr);
    // نكمل الإرسال بدون PDF
  }

  // الخطوة 3: إنشاء الإيميل
  const mailPayload: any = {
    subject: `Your Receipt - ${order.name}`,
    body_html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; padding: 20px;">
        <h3 style="color: #1a1a1a;">Thank you for your purchase!</h3>
        <p>Order: <strong>${order.name}</strong></p>
        <p>Total: <strong>$${Number(order.amount_total).toFixed(2)}</strong></p>
        <br/>
        <p style="color: #666; font-size: 12px;">This is an automated receipt.</p>
      </div>
    `,
    email_to: email,
    auto_delete: true,
  };

  // أضف المرفق فقط إذا نجح توليد الـ PDF
  if (pdfBase64) {
    mailPayload.attachment_ids = [
      [0, 0, {
        name: `receipt-${order.name}.pdf`,
        datas: pdfBase64,
        mimetype: "application/pdf",
      }],
    ];
  }

  // الخطوة 4: أنشئ وأرسل الإيميل
  const mailId = await odooRequest(
    "mail.mail",
    "create",
    [mailPayload],
    {}
  );

  await odooRequest("mail.mail", "send", [[mailId]], {});
}