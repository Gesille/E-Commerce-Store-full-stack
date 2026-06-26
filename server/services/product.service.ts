import { odooRequest } from "../odoo/odoo.client.js";
import { toCleanProduct } from "../mappers/product.mapper.js";

// ─── Fields ───────────────────────────────────────────────────────────────────

const PRODUCT_FIELDS = [
  "id",
  "default_code",
  "barcode",
  "name",
  "list_price",
  "standard_price",
  "x_shipping_cost",
  "x_markup",
  "x_final_price",
  "x_supplier_invoice_number",
  "currency_id",
  "qty_available",
  "image_1920",
  "categ_id",
  "taxes_id",
  "supplier_taxes_id",
];

const ATTR_FIELDS = ["id", "name", "attribute_id", "product_tmpl_id"];

// ─── Check if Odoo model exists ───────────────────────────────────────────────

const modelExists = async (modelName: string): Promise<boolean> => {
  try {
    await odooRequest(modelName, "search_read", [[]], { fields: ["id"], limit: 1 });
    return true;
  } catch {
    return false;
  }
};

// ─── mapProductInput ──────────────────────────────────────────────────────────

const mapProductInput = (
  p: any,
  suppliers: any[],
  purchaseOrders: any[],
  location: any
) => ({
  id: p.id,
  default_code: p.default_code,
  barcode: p.barcode,
  display_name: p.name,
  lst_price: p.list_price,
  standard_price: p.standard_price,
  x_shipping_cost: p.x_shipping_cost,
  x_markup: p.x_markup,
  x_final_price: p.x_final_price,
  x_supplier_invoice_number: p.x_supplier_invoice_number,
  currency_id: p.currency_id,
  qty_available: p.qty_available,
  image_1920: p.image_1920,
  categ_id: p.categ_id,
  taxes_id: p.taxes_id,
  supplier_taxes_id: p.supplier_taxes_id,
  product_tmpl_id: [p.id],
  suppliers,
  purchaseOrders,
  location,
});

// ─── Location helper ──────────────────────────────────────────────────────────

const getProductLocation = async (productVariantId: number) => {
  const quants = await odooRequest(
    "stock.quant",
    "search_read",
    [[["product_id", "=", productVariantId], ["location_id.usage", "=", "internal"]]],
    { fields: ["location_id", "quantity"], limit: 1 }
  );

  if (!quants.length) return null;

  const locationId = quants[0].location_id?.[0];
  const locationName = quants[0].location_id?.[1];

  const locationDetails = await odooRequest(
    "stock.location",
    "search_read",
    [[["id", "=", locationId]]],
    { fields: ["id", "name", "complete_name", "location_id"] }
  );

  const loc = locationDetails?.[0];

  return {
    shelfId: loc?.id || null,
    shelfName: loc?.name || null,
    fullPath: loc?.complete_name || locationName || null,
    warehouseId: loc?.location_id?.[0] || null,
    warehouseName: loc?.location_id?.[1] || null,
  };
};

// ─── Safe PO fetch — returns [] if purchase.order doesn't exist ───────────────

const safeFetchPurchaseOrders = async (
  templateIds: number[],
  allVariants: any[]
): Promise<Record<number, any[]>> => {
  try {
    const hasPurchaseModule = await modelExists("purchase.order");
    if (!hasPurchaseModule) {
      console.warn("⚠ purchase.order model not found — skipping PO fetch");
      return {};
    }

    const allPurchaseOrders = await odooRequest(
      "purchase.order",
      "search_read",
      [[["order_line.product_id.product_tmpl_id", "in", templateIds]]],
      {
        fields: [
          "id",
          "name",
          "partner_id",
          "date_order",
          "state",
          "amount_total",
          "x_supplier_invoice_number",
        ],
      }
    );

    if (!allPurchaseOrders.length) return {};

    const allPOLines = await odooRequest(
      "purchase.order.line",
      "search_read",
      [[["order_id", "in", allPurchaseOrders.map((po: any) => po.id)]]],
      { fields: ["order_id", "product_id"] }
    );

    const poById: Record<number, any> = {};
    allPurchaseOrders.forEach((po: any) => { poById[po.id] = po; });

    const posByTemplate: Record<number, any[]> = {};

    allPOLines.forEach((line: any) => {
      const variantId = line.product_id?.[0];
      const variant = allVariants.find((v: any) => v.id === variantId);
      if (!variant) return;

      const tmplId = variant.product_tmpl_id?.[0];
      const po = poById[line.order_id?.[0]];
      if (!po) return;

      if (!posByTemplate[tmplId]) posByTemplate[tmplId] = [];

      const alreadyAdded = posByTemplate[tmplId].find((x) => x.id === po.id);
      if (!alreadyAdded) {
        posByTemplate[tmplId].push({
          id: po.id,
          poNumber: po.name || null,
          invoiceNumber: po.x_supplier_invoice_number || null,
          supplierId: po.partner_id?.[0] || null,
          supplierName: po.partner_id?.[1] || null,
          date: po.date_order || null,
          status: po.state || null,
          totalAmount: po.amount_total || 0,
        });
      }
    });

    return posByTemplate;
  } catch (err: any) {
    console.warn("⚠ PO fetch failed, skipping:", err.message);
    return {};
  }
};

// ─── Safe PO fetch for single product ────────────────────────────────────────

const safeFetchPurchaseOrdersForProduct = async (
  variantId: number
): Promise<any[]> => {
  try {
    const hasPurchaseModule = await modelExists("purchase.order");
    if (!hasPurchaseModule) {
      console.warn("⚠ purchase.order model not found — skipping PO fetch");
      return [];
    }

    const poLines = await odooRequest(
      "purchase.order.line",
      "search_read",
      [[["product_id", "=", variantId]]],
      { fields: ["order_id"] }
    );

    const poIds = [...new Set(poLines.map((l: any) => l.order_id?.[0]).filter(Boolean))];
    if (!poIds.length) return [];

    const pos = await odooRequest(
      "purchase.order",
      "search_read",
      [[["id", "in", poIds]]],
      {
        fields: [
          "id",
          "name",
          "partner_id",
          "date_order",
          "state",
          "amount_total",
          "x_supplier_invoice_number",
        ],
      }
    );

    return pos.map((po: any) => ({
      id: po.id,
      poNumber: po.name || null,
      invoiceNumber: po.x_supplier_invoice_number || null,
      supplierId: po.partner_id?.[0] || null,
      supplierName: po.partner_id?.[1] || null,
      date: po.date_order || null,
      status: po.state || null,
      totalAmount: po.amount_total || 0,
    }));
  } catch (err: any) {
    console.warn("⚠ PO fetch failed, skipping:", err.message);
    return [];
  }
};

// ─── getAllProductsService ─────────────────────────────────────────────────────

export const getAllProductsService = async (category?: number) => {
  const domain: any[] = [];
  if (category) domain.push(["categ_id", "=", Number(category)]);

  const products = await odooRequest(
    "product.template",
    "search_read",
    [domain],
    { fields: PRODUCT_FIELDS }
  );

  const templateIds = products.map((p: any) => p.id);

  const attrs = await odooRequest(
    "product.template.attribute.value",
    "search_read",
    [[]],
    { fields: ATTR_FIELDS }
  );

  // many suppliers per product
  const supplierInfos = await odooRequest(
    "product.supplierinfo",
    "search_read",
    [[]],
    { fields: ["product_tmpl_id", "partner_id", "price", "product_code"] }
  );

  const allVariants = await odooRequest(
    "product.product",
    "search_read",
    [[["product_tmpl_id", "in", templateIds]]],
    { fields: ["id", "product_tmpl_id"] }
  );

  const variantIds = allVariants.map((v: any) => v.id);

  const allQuants = await odooRequest(
    "stock.quant",
    "search_read",
    [[["product_id", "in", variantIds], ["location_id.usage", "=", "internal"]]],
    { fields: ["product_id", "location_id", "quantity"] }
  );

  const locationIds = [
    ...new Set(allQuants.map((q: any) => q.location_id?.[0]).filter(Boolean)),
  ];

  const allLocations = locationIds.length
    ? await odooRequest(
        "stock.location",
        "search_read",
        [[["id", "in", locationIds]]],
        { fields: ["id", "name", "complete_name", "location_id"] }
      )
    : [];

  // ─── Lookup maps ──────────────────────────────────────────────────────────

  const variantByTemplate: Record<number, number> = {};
  allVariants.forEach((v: any) => {
    variantByTemplate[v.product_tmpl_id?.[0]] = v.id;
  });

  const quantByVariant: Record<number, any> = {};
  allQuants.forEach((q: any) => {
    quantByVariant[q.product_id?.[0]] = q;
  });

  const locationById: Record<number, any> = {};
  allLocations.forEach((l: any) => {
    locationById[l.id] = l;
  });

  // templateId → [suppliers]  (many suppliers per product)
  const suppliersByTemplate: Record<number, any[]> = {};
  supplierInfos.forEach((s: any) => {
    const tmplId = s.product_tmpl_id?.[0];
    if (!tmplId) return;
    if (!suppliersByTemplate[tmplId]) suppliersByTemplate[tmplId] = [];
    suppliersByTemplate[tmplId].push({
      id: s.partner_id?.[0] || null,
      name: s.partner_id?.[1] || null,
      price: s.price || 0,
      productCode: s.product_code || null,
    });
  });

  // templateId → [POs]  (many POs per product, safe — returns {} if not installed)
  const posByTemplate = await safeFetchPurchaseOrders(templateIds, allVariants);

  // ─── Map ─────────────────────────────────────────────────────────────────

  return products.map((p: any) => {
    const variantId = variantByTemplate[p.id];
    const quant = variantId ? quantByVariant[variantId] : null;
    const loc = quant ? locationById[quant.location_id?.[0]] : null;

    const location = loc
      ? {
          shelfId: loc.id || null,
          shelfName: loc.name || null,
          fullPath: loc.complete_name || null,
          warehouseId: loc.location_id?.[0] || null,
          warehouseName: loc.location_id?.[1] || null,
        }
      : null;

    return toCleanProduct(
      mapProductInput(
        p,
        suppliersByTemplate[p.id] || [],
        posByTemplate[p.id] || [],
        location
      ),
      attrs
    );
  });
};

// ─── getProductByIdService ────────────────────────────────────────────────────

export const getProductByIdService = async (id: number) => {
  const product = await odooRequest(
    "product.template",
    "search_read",
    [[["id", "=", id]]],
    { fields: PRODUCT_FIELDS, limit: 1 }
  );

  if (!product.length) return null;

  const attrs = await odooRequest(
    "product.template.attribute.value",
    "search_read",
    [[["product_tmpl_id", "=", id]]],
    { fields: ATTR_FIELDS }
  );

  // many suppliers for this product
  const supplierInfos = await odooRequest(
    "product.supplierinfo",
    "search_read",
    [[["product_tmpl_id", "=", id]]],
    { fields: ["partner_id", "price", "product_code"] }
  );

  const suppliers = supplierInfos.map((s: any) => ({
    id: s.partner_id?.[0] || null,
    name: s.partner_id?.[1] || null,
    price: s.price || 0,
    productCode: s.product_code || null,
  }));

  const variants = await odooRequest(
    "product.product",
    "search_read",
    [[["product_tmpl_id", "=", id]]],
    { fields: ["id"], limit: 1 }
  );

  let location = null;
  if (variants.length) {
    location = await getProductLocation(variants[0].id);
  }

  // many POs for this product (safe — returns [] if not installed)
  const purchaseOrders = variants.length
    ? await safeFetchPurchaseOrdersForProduct(variants[0].id)
    : [];

  return toCleanProduct(
    mapProductInput(product[0], suppliers, purchaseOrders, location),
    attrs
  );
};

// ─── checkOdooConnection ──────────────────────────────────────────────────────

export const checkOdooConnection = async () => {
  try {
    const result = await odooRequest(
      "res.users",
      "search_read",
      [],
      { fields: ["id"], limit: 1 }
    );
    return { success: true, message: "Odoo connection successful", data: result };
  } catch (error: any) {
    return { success: false, message: "Odoo connection failed", error: error.message };
  }
};