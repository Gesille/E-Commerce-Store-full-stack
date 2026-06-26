export const toCleanProduct = (
  product: any,
  attributeValues: any[]
) => {
  const templateId = product.product_tmpl_id?.[0];

  const hasTemplateId = attributeValues.length && attributeValues[0].product_tmpl_id;

  const attrs = hasTemplateId
    ? attributeValues.filter((a) => a.product_tmpl_id?.[0] === templateId)
    : attributeValues;

  const getAll = (type: string) =>
    attrs
      .filter((a: any) => a.attribute_id?.[1]?.toLowerCase().includes(type))
      .map((a: any) => a.name);

  const getBrand = () => {
    const match = attrs.find(
      (a: any) => a.attribute_id?.[1]?.toLowerCase() === "brand"
    );
    return match?.name || null;
  };

  return {
    id: product.id,
    itemNumber: product.item_number || null,
    reference: product.default_code || null,
    barcode: product.barcode || null,
    name: product.display_name,

    // ── Pricing: all values come from Odoo, no calculation here ──
    price: product.lst_price || product.list_price || 0,   // final selling price from Odoo
    supplierPrice: product.standard_price || 0,            // raw cost
    shippingCost: product.x_shipping_cost || 0,            // custom Odoo field
    markup: product.x_markup || 1,                         // custom Odoo field
    finalPrice: product.x_final_price || 0,                // computed in Odoo

    // ── Stock: comes from Odoo stock.quant ───────────────────────
    stock: product.qty_available || 0,

    // ── Meta ─────────────────────────────────────────────────────
    image: product.image_1920 || false,
    supplierInvoiceNumber: product.x_supplier_invoice_number || "",
    category: product.categ_id?.[1] || null,
    currency: product.currency_id?.[1] || "XCD",
    supplier: product.supplier_name || null,
    location: product.location || null,

    taxes: {
      sales: product.taxes_id || [],
      purchase: product.supplier_taxes_id || [],
    },

    attributes: {
      brand: getBrand(),
      colors: getAll("color"),
      sizes: getAll("size"),
      materials: getAll("material"),
    },
  };
};