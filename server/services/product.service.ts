import { odooRequest } from "../odoo/odoo.client.js";
import { toCleanProduct } from "../mappers/product.mapper.js";


export const getAllProductsService = async (category?: number) => {
  const domain: any[] = [];

  // 🔥 filter by category if exists
  if (category) {
    domain.push(["categ_id", "=", Number(category)]);
  }

  const products = await odooRequest(
    "product.template",
    "search_read",
    [domain],
    {
      fields: [
        "id",
         "default_code",
        "name",
        "list_price",
        "qty_available",
        "image_1920",
        "categ_id",
        "taxes_id",
        "supplier_taxes_id",
      ],
    }
  );

  const attrs = await odooRequest(
    "product.template.attribute.value",
    "search_read",
    [[]],
    {
      fields: ["id" ,"name", "attribute_id", "product_tmpl_id"],
    }
  );

  return products.map((p: any) =>
    toCleanProduct(
      {
        id: p.id,
        default_code:p.default_code,
        display_name: p.name,
        lst_price: p.list_price,
        qty_available: p.qty_available,
        image_1920: p.image_1920,
        categ_id: p.categ_id,
        taxes_id: p.taxes_id,
        supplier_taxes_id: p.supplier_taxes_id,
        product_tmpl_id: [p.id],
      },
      attrs
    )
  );
};




export const getProductByIdService = async (id: number) => {
  const product = await odooRequest(
    "product.template",
    "search_read",
    [[["id", "=", id]]],
    {
      fields: [
        "id",
        "default_code",
        "name",
        "list_price",
        "qty_available",
        "image_1920",
        "categ_id",
        "taxes_id",
        "supplier_taxes_id",
      ],
      limit: 1,
    }
  );

  if (!product.length) return null;

  const attrs = await odooRequest(
    "product.template.attribute.value",
    "search_read",
    [[["product_tmpl_id", "=", id]]],
    {
      fields: ["id","name", "attribute_id", "product_tmpl_id"],
    }
  );

  return toCleanProduct(
    {
      id: product[0].id,
      default_code :product[0].default_code,
      display_name: product[0].name,
      lst_price: product[0].list_price,
      qty_available: product[0].qty_available,
      image_1920: product[0].image_1920,
      categ_id: product[0].categ_id,
      taxes_id: product[0].taxes_id,
      supplier_taxes_id: product[0].supplier_taxes_id,
      product_tmpl_id: [product[0].id],
    },
    attrs
  );
};


// test
export const checkOdooConnection = async () => {
  try {
    const result = await odooRequest(
      "res.users",
      "search_read",
      [],
      { fields: ["id"], limit: 1 }
    );

    return {
      success: true,
      message: "Odoo connection successful",
      data: result,
    };
  } catch (error: any) {
    return {
      success: false,
      message: "Odoo connection failed",
      error: error.message,
    };
  }
};

