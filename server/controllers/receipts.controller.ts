import { odooRequest } from "../odoo/odoo.client.js";


export interface ReceiptListParams {
  page?: number;
  limit?: number;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  state?: string;
}

export interface ReceiptListResult {
  receipts: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}


export async function getReceipts(
  params: ReceiptListParams
): Promise<ReceiptListResult> {
  const { page = 1, limit = 20, search = "", dateFrom, dateTo, state } = params;

  const domain: any[] = [["state", "in", ["paid", "done", "invoiced"]]];

  if (search.trim()) {
    domain.push("|", "|");
    domain.push(["name", "ilike", search]);
    domain.push(["pos_reference", "ilike", search]);
    domain.push(["partner_id.name", "ilike", search]);
  }

  if (dateFrom) domain.push(["date_order", ">=", dateFrom]);
  if (dateTo)   domain.push(["date_order", "<=", dateTo]);
  if (state)    domain.push(["state", "=", state]);

  const [receipts, total] = await Promise.all([
    odooRequest("pos.order", "search_read", [domain], {
      fields: [
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

// ─── Single Receipt Detail ────────────────────────────────────────────────────

export async function getReceiptById(id: number) {
  const [order] = await odooRequest("pos.order", "read", [[id]], {
    fields: [
      "name",
      "pos_reference",
      "date_order",
      "partner_id",
      "user_id",
      "config_id",
      "session_id",
      "amount_total",
      "amount_tax",
      "amount_untaxed",
      "amount_paid",
      "amount_return",
      "state",
      "lines",
      "payment_ids",
      "note",
    ],
  });

  if (!order) throw new Error("Receipt not found");

  const [lines, payments] = await Promise.all([
    order.lines?.length
      ? odooRequest("pos.order.line", "read", [order.lines], {
          fields: [
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
          fields: ["payment_method_id", "amount", "payment_date"],
        })
      : [],
  ]);

  return { order, lines, payments };
}