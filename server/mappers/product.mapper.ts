export const toCleanProduct = (
  product: any,
  attributeValues: any[]
) => {
  const templateId = product.product_tmpl_id?.[0];

  // detect source type
  const hasTemplateId = attributeValues.length && attributeValues[0].product_tmpl_id;

  // STEP 1: filter
  const attrs = hasTemplateId
    ? attributeValues.filter(
        (a) => a.product_tmpl_id?.[0] === templateId
      )
    : attributeValues;

  const getAll = (type: string) =>
    attrs
      .filter((a: any) =>
        a.attribute_id?.[1]?.toLowerCase().includes(type)
      )
      .map((a: any) => a.name);

  const getBrand = () => {
    const match = attrs.find(
      (a: any) =>
        a.attribute_id?.[1]?.toLowerCase() === "brand"
    );
    return match?.name || null;
  };

  return {
    id: product.id,
    reference: product.default_code || null,
    name: product.display_name,
    price: product.lst_price,
    stock: product.qty_available,
    image: product.image_1920 || false,

    category: product.categ_id?.[1] || null,

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