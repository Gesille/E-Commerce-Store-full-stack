import { odooRequest } from "../odoo/odoo.client.js";
import { toCleanProduct } from "../mappers/product.mapper.js";
const PRODUCT_FIELDS = [
    "id",
    "default_code",
    "barcode",
    "name",
    "list_price",
    "standard_price",
    "currency_id",
    "qty_available",
    "image_1920",
    "categ_id",
    "taxes_id",
    "supplier_taxes_id",
     "x_supplier_invoice_number", 
];
const ATTR_FIELDS = ["id", "name", "attribute_id", "product_tmpl_id"];
const mapProductInput = (p, supplierName, location) => ({
    id: p.id,
    default_code: p.default_code,
    barcode: p.barcode,
    display_name: p.name,
    lst_price: p.list_price,
    standard_price: p.standard_price,
    currency_id: p.currency_id,
    qty_available: p.qty_available,
    image_1920: p.image_1920,
    categ_id: p.categ_id,
    taxes_id: p.taxes_id,
    supplier_taxes_id: p.supplier_taxes_id,
    product_tmpl_id: [p.id],
    supplier_name: supplierName,
    location,
    x_supplier_invoice_number: p.x_supplier_invoice_number || "", 
});

const getProductLocation = async (productVariantId) => {
    const quants = await odooRequest("stock.quant", "search_read", [[["product_id", "=", productVariantId], ["location_id.usage", "=", "internal"]]], { fields: ["location_id", "quantity"], limit: 1 });
    if (!quants.length)
        return null;
    const locationId = quants[0].location_id?.[0];
    const locationName = quants[0].location_id?.[1];
 
    const locationDetails = await odooRequest("stock.location", "search_read", [[["id", "=", locationId]]], { fields: ["id", "name", "complete_name", "location_id"] });
    const loc = locationDetails?.[0];
    return {
        shelfId: loc?.id || null,
        shelfName: loc?.name || null,
        fullPath: loc?.complete_name || locationName || null, 
        warehouseId: loc?.location_id?.[0] || null,
        warehouseName: loc?.location_id?.[1] || null,
    };
};
export const getAllProductsService = async (category) => {
    const domain = [];
    if (category)
        domain.push(["categ_id", "=", Number(category)]);
    const products = await odooRequest("product.template", "search_read", [domain], { fields: PRODUCT_FIELDS });
    const attrs = await odooRequest("product.template.attribute.value", "search_read", [[]], { fields: ATTR_FIELDS });
    const supplierInfos = await odooRequest("product.supplierinfo", "search_read", [[]], { fields: ["product_tmpl_id", "partner_id", "price"] });
    // ✅ جلب الـ variants لكل المنتجات دفعة وحدة
    const templateIds = products.map((p) => p.id);
    const allVariants = await odooRequest("product.product", "search_read", [[["product_tmpl_id", "in", templateIds]]], { fields: ["id", "product_tmpl_id"] });
    // ✅ جلب الـ quants لكل الـ variants دفعة وحدة
    const variantIds = allVariants.map((v) => v.id);
    const allQuants = await odooRequest("stock.quant", "search_read", [[["product_id", "in", variantIds], ["location_id.usage", "=", "internal"]]], { fields: ["product_id", "location_id", "quantity"] });
    // ✅ جلب تفاصيل الـ locations دفعة وحدة
    const locationIds = [...new Set(allQuants.map((q) => q.location_id?.[0]).filter(Boolean))];
    const allLocations = locationIds.length
        ? await odooRequest("stock.location", "search_read", [[["id", "in", locationIds]]], { fields: ["id", "name", "complete_name", "location_id"] })
        : [];
    // بناء maps للبحث السريع
    const variantByTemplate = {};
    allVariants.forEach((v) => {
        variantByTemplate[v.product_tmpl_id?.[0]] = v.id;
    });
    const quantByVariant = {};
    allQuants.forEach((q) => {
        quantByVariant[q.product_id?.[0]] = q;
    });
    const locationById = {};
    allLocations.forEach((l) => {
        locationById[l.id] = l;
    });
    return products.map((p) => {
        const supplier = supplierInfos.find((s) => s.product_tmpl_id?.[0] === p.id);
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
        return toCleanProduct(mapProductInput(p, supplier?.partner_id?.[1] || null, location), attrs);
    });
};
export const getProductByIdService = async (id) => {
    const product = await odooRequest("product.template", "search_read", [[["id", "=", id]]], { fields: PRODUCT_FIELDS, limit: 1 });
    if (!product.length)
        return null;
    const attrs = await odooRequest("product.template.attribute.value", "search_read", [[["product_tmpl_id", "=", id]]], { fields: ATTR_FIELDS });
    const supplierInfos = await odooRequest("product.supplierinfo", "search_read", [[["product_tmpl_id", "=", id]]], { fields: ["partner_id", "price"], limit: 1 });
    // ✅ جلب الـ variant
    const variants = await odooRequest("product.product", "search_read", [[["product_tmpl_id", "=", id]]], { fields: ["id"], limit: 1 });
    let location = null;
    if (variants.length) {
        location = await getProductLocation(variants[0].id);
    }
    return toCleanProduct(mapProductInput(product[0], supplierInfos?.[0]?.partner_id?.[1] || null, location), attrs);
};
export const checkOdooConnection = async () => {
    try {
        const result = await odooRequest("res.users", "search_read", [], { fields: ["id"], limit: 1 });
        return { success: true, message: "Odoo connection successful", data: result };
    }
    catch (error) {
        return { success: false, message: "Odoo connection failed", error: error.message };
    }
};
