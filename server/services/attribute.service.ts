import { odooRequest } from "../odoo/odoo.client.js";

export const getAttributeValuesService = async () => {
  return await odooRequest(
    "product.template.attribute.value",
    "search_read",
    [[]],
    {
      fields: ["id", "name", "attribute_id", "product_tmpl_id"],
    }
  );
};
export const buildAttributeMap = (attrs: any[]) => {
  return Object.fromEntries(attrs.map((a) => [a.id, a]));
};