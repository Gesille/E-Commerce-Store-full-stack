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

  // ── Suppliers: array because many suppliers can supply this product ──
  const suppliers = (product.suppliers ?? []).map((s: any) => ({
    id: s.partner_id?.[0] || null,
    name: s.partner_id?.[1] || null,
    price: s.price || 0,
    productCode: s.product_code || null,  // supplier's own ref for this product
  }));

  // ── POs: array because this product can appear in many POs ──────────
  // Each PO is linked by product.name + invoiceNumber
  const purchaseOrders = (product.purchaseOrders ?? []).map((po: any) => ({
    id: po.id || null,
    poNumber: po.name || null,        
    invoiceNumber: po.invoiceNumber || product.x_supplier_invoice_number || null,
    supplierId: po.partner_id?.[0] || null,
    supplierName: po.partner_id?.[1] || null,
    date: po.date_order || null,
    status: po.state || null,             // draft | confirmed | received
    // connection key: product name + invoice number
    productName: product.display_name,    
    totalAmount: po.amount_total || 0,
  }));

  return {
    id: product.id,
    itemNumber: product.item_number || null,
    reference: product.default_code || null,
    barcode: product.barcode || null,
    name: product.display_name,


    price: product.lst_price || product.list_price || 0,
    supplierPrice: product.standard_price || 0,
    shippingCost: product.x_shipping_cost || 0,
    markup: product.x_markup || 1,
    finalPrice: product.x_final_price || 0,

 
    stock: product.qty_available || 0,

    // ── Supplier (MANY — multiple suppliers can supply this product) ───
    suppliers,                           
    supplier: suppliers[0]?.name || null, 


    purchaseOrders,                      

    invoiceNumber: product.x_supplier_invoice_number || null,

 
    image: product.image_1920 || false,
    category: product.categ_id?.[1] || null,
    currency: product.currency_id?.[1] || "XCD",
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