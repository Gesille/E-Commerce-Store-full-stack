import { odooRequest } from "../odoo/odoo.client.js";

export async function getOdooAttributeValueNames(attributeName: string): Promise<string[]> {
  const attrs = await odooRequest(
    "product.attribute",
    "search_read",
    [[["name", "=", attributeName]]],
    { fields: ["id"] },
  );

  if (!attrs.length) return [];

  const values = await odooRequest(
    "product.attribute.value",
    "search_read",
    [[["attribute_id", "=", attrs[0].id]]],
    { fields: ["name"] },
  );

  return values
    .map((v: any) => v.name)
    .sort((a: string, b: string) => a.localeCompare(b));
}


export async function ensureOdooAttributeValues(
  attributeName: string,
  values: string[],
): Promise<string[]> {
  const cleaned = [...new Set(values.map((v) => v.trim()).filter(Boolean))];
  if (!cleaned.length) return [];


  const attrs = await odooRequest(
    "product.attribute",
    "search_read",
    [[["name", "=", attributeName]]],
    { fields: ["id"] },
  );

  const attributeId = attrs.length
    ? attrs[0].id
    : await odooRequest("product.attribute", "create", [
        { name: attributeName, create_variant: "no_variant" },
      ]);


  const existing = await odooRequest(
    "product.attribute.value",
    "search_read",
    [[["attribute_id", "=", attributeId]]],
    { fields: ["id", "name"] },
  );

  const byKey = new Map(existing.map((v: any) => [v.name.toLowerCase(), v.name]));
  const finalNames: string[] = [];


  for (const raw of cleaned) {
    const key = raw.toLowerCase();
    if (byKey.has(key)) {
      finalNames.push(byKey.get(key)! as any);
    } else {
      await odooRequest("product.attribute.value", "create", [
        { name: raw, attribute_id: attributeId },
      ]);
      byKey.set(key, raw);
      finalNames.push(raw);
    }
  }

  return finalNames;
}