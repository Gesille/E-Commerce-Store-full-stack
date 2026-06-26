export const toCleanProduct = (product, attributeValues) => {
  const templateId = product.product_tmpl_id?.[0];
  // detect source type
  const hasTemplateId =
    attributeValues.length && attributeValues[0].product_tmpl_id;
  // STEP 1: filter
  const attrs = hasTemplateId
    ? attributeValues.filter((a) => a.product_tmpl_id?.[0] === templateId)
    : attributeValues;
  const getAll = (type) =>
    attrs
      .filter((a) => a.attribute_id?.[1]?.toLowerCase().includes(type))
      .map((a) => a.name);
  const getBrand = () => {
    const match = attrs.find(
      (a) => a.attribute_id?.[1]?.toLowerCase() === "brand",
    );
    return match?.name || null;
  };
  const XCD_RATES = { USD: 2.67, EUR: 3.15 };
  const currencyName = product.currency_id?.[1] || "USD";
  const detectedCurrency =
    Object.keys(XCD_RATES).find((k) =>
      currencyName.toUpperCase().includes(k),
    ) || "USD";
  const rate = XCD_RATES[detectedCurrency];
  const finalPriceXCD = parseFloat(
    ((product.standard_price || 0) * rate).toFixed(2),
  );
  return {
    id: product.id,
    itemNumber: product.item_number || null,
    shippingCost: product.x_shipping_cost || 0,
    currency: product.x_currency || "USD",
    supplierInvoiceNumber: product.x_supplier_invoice_number || "",
    reference: product.default_code || null,
    barcode: product.barcode || null,
    name: product.display_name,
    price: product.lst_price,
    stock: product.qty_available,
    image: product.image_1920 || false,
    category: product.categ_id?.[1] || null,
    supplierPrice: product.standard_price || 0,
    currency: detectedCurrency,
    finalPriceXCD,
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
