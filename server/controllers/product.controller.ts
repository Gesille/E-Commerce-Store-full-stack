import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncError.js";
import ErrorHandler from "../utils/ErrorHandler.js";
import {
  checkOdooConnection,
  getAllProductsService,
  getProductByIdService,
} from "../services/product.service.js";
import { odooRequest } from "../odoo/odoo.client.js";

import axios from "axios";

import Order from "../models/order.model.js";
import cloudinary, { uploadImage } from "../utils/uploadImages.js";
import { ensureOdooAttributeValues } from "../utils/odooAttributes.js";
import { Product } from "../models/product.model.js";

cloudinary.v2.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

export const testOdooConnection = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await checkOdooConnection();

      if (!result.success) {
        return next(new ErrorHandler(result.message, 500));
      }

      res.status(200).json(result);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  },
);

// GET ALL
export const getAllProductsFromOdoo = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    // Changed from req.query.category → req.query.categoryId
    const category = req.query.categoryId
      ? Number(req.query.categoryId)
      : undefined;

    const products = await getAllProductsService(category);

    res.status(200).json({ success: true, products });
  },
);

export const getProductByIdFromOdoo = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = Number(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Invalid product id",
      });
    }

    const product = await getProductByIdService(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      product,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// create products

const toBase64 = async (url: string) => {
  const res = await axios.get(url, {
    responseType: "arraybuffer",
  });

  return Buffer.from(res.data, "binary").toString("base64");
};

const createOrGetAttribute = async (name: string): Promise<number> => {
  const existing = await odooRequest(
    "product.attribute",
    "search_read",
    [[["name", "=", name]]],
    { fields: ["id", "name"], limit: 1 },
  );
  if (existing[0]) return existing[0].id;
  return await odooRequest("product.attribute", "create", [
    {
      name,
      create_variant: "no_variant",
    },
  ]);
};

const createAttributeValue = async (
  attributeId: number,
  value: string,
): Promise<number> => {
  const existing = await odooRequest(
    "product.attribute.value",
    "search_read",
    [
      [
        ["attribute_id", "=", attributeId],
        ["name", "=", value],
      ],
    ],
    { fields: ["id", "name"], limit: 1 },
  );

  if (existing[0]) return existing[0].id;

  // Create scoped to this attribute
  return await odooRequest("product.attribute.value", "create", [
    { attribute_id: attributeId, name: value },
  ]);
};
const syncAttributeLine = async (
  productTemplateId: number,
  attributeId: number,
  valueIds: number[],
) => {
  const existingLine = await odooRequest(
    "product.template.attribute.line",
    "search_read",
    [
      [
        ["product_tmpl_id", "=", productTemplateId],
        ["attribute_id", "=", attributeId],
      ],
    ],
    { fields: ["id"], limit: 1 },
  );

  if (!valueIds.length) {
    if (existingLine.length) {
      await odooRequest("product.template.attribute.line", "unlink", [
        [existingLine[0].id],
      ]);
    }
    return;
  }

  if (existingLine.length) {
    await odooRequest("product.template.attribute.line", "write", [
      [existingLine[0].id],
      { value_ids: [[6, 0, valueIds]] },
    ]);
  } else {
    await odooRequest("product.template.attribute.line", "create", [
      {
        product_tmpl_id: productTemplateId,
        attribute_id: attributeId,
        value_ids: [[6, 0, valueIds]],
      },
    ]);
  }
};

const ATTRIBUTE_NAME_MAP: Record<string, string> = {
  colors: "Color",
  sizes: "Size",
  materials: "Material",
};
const createAttributeLines = async (
  productTemplateId: number,
  attributeId: number,
  valueIds: number[],
) => {
  for (const valId of valueIds) {
    await odooRequest("product.template.attribute.line", "create", [
      {
        product_tmpl_id: productTemplateId,
        attribute_id: attributeId,
        value_ids: [[6, 0, [valId]]],
      },
    ]);
  }
};



// ─── Landed Cost Utility ─────────────────────────────────────────────────────


const XCD_RATES: Record<string, number> = { USD: 2.7, EUR: 2.9 };

function calcLandedCost(body: Record<string, any>) {
  const currency: string = body.currency ?? "USD";
  const exchangeRate: number = XCD_RATES[currency] ?? 2.7;

  // 1. Buy price converted to XCD
  const supplierPrice = Number(body.supplierPrice) || 0;
  const buyPriceXCD = supplierPrice * exchangeRate;

  // 2. All landed costs (already entered in XCD by the user)
  const internationalCosts =
    (Number(body.freightInternational) || 0) +
    (Number(body.transportationStorageInternational) || 0) +
    (Number(body.portFeesInternational) || 0) +
    (Number(body.brokerageHandlingInternational) || 0) +
    (Number(body.customsDutiesInternational) || 0) +
    (Number(body.tariffsInternational) || 0) +
    (Number(body.insurancesInternational) || 0) +
    (Number(body.vatTaxesInternational) || 0) +
    (Number(body.currencyConversion) || 0) +
    (Number(body.paymentProcessing) || 0) +
    (Number(body.bankCharges) || 0);

  const localCosts =
    (Number(body.transportationStorageLocal) || 0) +
    (Number(body.portFeesLocal) || 0) +
    (Number(body.brokerageHandlingLocal) || 0) +
    (Number(body.customsDutiesLocal) || 0) +
    (Number(body.tariffsLocal) || 0) +
    (Number(body.insurancesLocal) || 0) +
    (Number(body.vatTaxesLocal) || 0) +
    (Number(body.documentationCosts) || 0) +
    (Number(body.internalFees) || 0);

  const totalCostsXCD = internationalCosts + localCosts;

  // 3. Landed cost = buy price + all costs ascribed to this unit
  const landedCostXCD = buyPriceXCD + totalCostsXCD;

  // 4. Final selling price = landed cost × markup
  const markup = Number(body.markup) || 1;
  const finalPriceXCD = landedCostXCD * markup;

  return { buyPriceXCD, totalCostsXCD, landedCostXCD, finalPriceXCD, exchangeRate };
}

// ─── Controller ──────────────────────────────────────────────────────────────

export const createProduct = async (req: Request, res: Response) => {
  let createdProductTemplateId: number | null = null;

  try {
    const {
      name,
      stock,
      categoryId,
      image,
      attributes,
      reference,
      barcode,
      itemNumber,
      locationId,
      warehouseName,
      shelfName,
      supplierId,
      supplierName,
      supplierPrice,
      currency,
      markup,
      freightInternational,
      transportationStorageInternational,
      portFeesInternational,
      brokerageHandlingInternational,
      customsDutiesInternational,
      tariffsInternational,
      insurancesInternational,
      vatTaxesInternational,
      currencyConversion,
      paymentProcessing,
      bankCharges,
      transportationStorageLocal,
      portFeesLocal,
      brokerageHandlingLocal,
      customsDutiesLocal,
      tariffsLocal,
      insurancesLocal,
      vatTaxesLocal,
      documentationCosts,
      internalFees,
    } = req.body;

    const { buyPriceXCD, totalCostsXCD, landedCostXCD, finalPriceXCD, exchangeRate } =
      calcLandedCost(req.body);

    let base64Image: string | null = null;
    if (image) base64Image = await toBase64(image);

    createdProductTemplateId = await odooRequest("product.template", "create", [
      {
        name,
        list_price: parseFloat(finalPriceXCD.toFixed(2)),
        standard_price: parseFloat(buyPriceXCD.toFixed(2)),
        default_code: itemNumber || reference || false,
        barcode: barcode || false,
        type: "consu",
        is_storable: true,
        active: true,
        sale_ok: true,
        purchase_ok: true,
        categ_id: categoryId,
        image_1920: base64Image || false,
        x_supplier_invoice_number: supplierId || false,
      },
    ]);

    if (!createdProductTemplateId)
      throw new Error("Failed to retrieve Product Template ID from Odoo.");

    // ── Supplier: find or create partner in Odoo ──────────────────────────
    let resolvedSupplierId: number | null = null;

    if (supplierName || supplierId) {
      const suppliers = await odooRequest(
        "res.partner",
        "search_read",
        [
          [
            "|",
            ["name", "=", supplierName || ""],
            ["ref", "=", supplierId || ""],
          ],
        ],
        { fields: ["id", "name", "ref"], limit: 1 }
      );

      if (suppliers.length > 0) {
        resolvedSupplierId = suppliers[0].id;
      } else {
        resolvedSupplierId = await odooRequest("res.partner", "create", [
          {
            name: supplierName || "Unknown Supplier",
            ref: supplierId || false,
            supplier_rank: 1,
          },
        ]);
      }

      await odooRequest("product.supplierinfo", "create", [
        {
          product_tmpl_id: createdProductTemplateId,
          partner_id: resolvedSupplierId,
          price: Number(supplierPrice) || 0,
          product_code: supplierId || false,
        },
      ]);
    }

    // ── Attributes ────────────────────────────────────────────────────────
    if (attributes) {
      for (const key in attributes) {
        const values = Array.isArray(attributes[key])
          ? attributes[key]
          : [attributes[key]];
        if (!values || values.length === 0) continue;

        const odooAttributeName = ATTRIBUTE_NAME_MAP[key] ?? key;
        const attributeId = await createOrGetAttribute(odooAttributeName);
        const valueIds: number[] = [];
        for (const val of values) {
          const id = await createAttributeValue(attributeId, val);
          valueIds.push(id);
        }
        await createAttributeLines(createdProductTemplateId!, attributeId, valueIds);
      }
    }

    // ── Get product variant ───────────────────────────────────────────────
    const variant = await odooRequest(
      "product.product",
      "search_read",
      [[["product_tmpl_id", "=", createdProductTemplateId]]],
      { fields: ["id"], limit: 1 }
    );

    if (!variant || variant.length === 0)
      throw new Error("Could not find product variant.");

    const productId = variant[0].id;

    // ── Resolve / Create Odoo location ────────────────────────────────────
    let resolvedLocationId: number | null = locationId ?? null;
    let resolvedWarehouseName = warehouseName || "";
    let resolvedShelfName = shelfName || "";

    if (!resolvedLocationId && warehouseName && shelfName) {
      const warehouseResults = await odooRequest(
        "stock.location",
        "search_read",
        [[["name", "=", warehouseName], ["usage", "=", "internal"]]],
        { fields: ["id", "name"], limit: 1 }
      );

      let warehouseLocationId: number;

      if (warehouseResults.length) {
        warehouseLocationId = warehouseResults[0].id;
      } else {
        warehouseLocationId = await odooRequest("stock.location", "create", [
          { name: warehouseName, usage: "internal" },
        ]);
      }

      const shelfResults = await odooRequest(
        "stock.location",
        "search_read",
        [
          [
            ["name", "=", shelfName],
            ["location_id", "=", warehouseLocationId],
            ["usage", "=", "internal"],
          ],
        ],
        { fields: ["id"], limit: 1 }
      );

      if (shelfResults.length) {
        resolvedLocationId = shelfResults[0].id;
      } else {
        resolvedLocationId = await odooRequest("stock.location", "create", [
          {
            name: shelfName,
            location_id: warehouseLocationId,
            usage: "internal",
          },
        ]);
      }
    } else if (!resolvedLocationId) {
      if (shelfName) {
        const found = await odooRequest(
          "stock.location",
          "search_read",
          [[["usage", "=", "internal"], ["name", "=", shelfName]]],
          { fields: ["id"], limit: 1 }
        );
        if (found[0]) resolvedLocationId = found[0].id;
      }

      if (!resolvedLocationId) {
        const fallback = await odooRequest(
          "stock.location",
          "search_read",
          [[["usage", "=", "internal"]]],
          { fields: ["id", "name", "complete_name"], limit: 1 }
        );
        if (!fallback.length)
          throw new Error("No internal stock location found in Odoo.");
        resolvedLocationId = fallback[0].id;
      }
    }

    // ── Set stock via stock.quant ─────────────────────────────────────────
    const quantId = await odooRequest("stock.quant", "create", [
      {
        product_id: productId,
        location_id: resolvedLocationId,
        inventory_quantity: Number(stock),
      },
    ]);

    await odooRequest("stock.quant", "action_apply_inventory", [[quantId]]);

    res.json({
      success: true,
      productTemplateId: createdProductTemplateId,
      productId,
      costing: {
        supplierPrice: Number(supplierPrice) || 0,
        currency: currency || "USD",
        exchangeRate,
        buyPriceXCD: parseFloat(buyPriceXCD.toFixed(2)),
        totalCostsXCD: parseFloat(totalCostsXCD.toFixed(2)),
        landedCostXCD: parseFloat(landedCostXCD.toFixed(2)),
        markup: Number(markup) || 1,
        finalPriceXCD: parseFloat(finalPriceXCD.toFixed(2)),
      },
      location: {
        id: resolvedLocationId,
        shelfName: resolvedShelfName,
        warehouseName: resolvedWarehouseName,
      },
    });
  } catch (err: any) {
    console.error("Odoo Logic Failed:", err.message);

    if (createdProductTemplateId) {
      await odooRequest("product.template", "unlink", [
        [createdProductTemplateId],
      ]).catch((e) => console.error("Critical: Cleanup failed!", e.message));
    }

    res.status(500).json({
      success: false,
      message: `Failed to complete product creation: ${err.message}`,
    });
  }
};
// decrease strock
export const decreaseStock = async (productId: number, qty: number) => {
  // get locations
  const locations = await odooRequest("stock.location", "search_read", [], {
    fields: ["id", "usage"],
  });

  const source = locations.find((l: any) => l.usage === "internal");
  const dest = locations.find((l: any) => l.usage === "customer");

  // create stock move
  await odooRequest("stock.move", "create", [
    {
      name: "Sale",
      product_id: productId,
      product_uom_qty: qty,
      product_uom: 1,
      location_id: source.id,
      location_dest_id: dest.id,
    },
  ]);
};


// update product
export const updateProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      price,
      stock,
      reference,
      barcode,
      itemNumber,
      attributes,
      warehouseName,
      shelfName,
      supplierId,
      supplierName,
      supplierPrice,
      shippingCost,
      currency,
    } = req.body;

    let imageUrl: string | null = null;
    let base64Image: string | null = null;

    if (req.body.image) {
      const uploaded = await uploadImage(req.body.image);
      imageUrl = uploaded.url;
      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer",
      });
      base64Image = Buffer.from(response.data, "binary").toString("base64");
    }

    await odooRequest("product.template", "write", [
      [Number(id)],
      {
        name,
        list_price: Number(price) || 0,
        standard_price: Number(supplierPrice) || 0,
        default_code: itemNumber || reference || false,
        barcode: barcode || false,
        x_item_number: itemNumber || false,
        x_shipping_cost: Number(shippingCost) || 0,
        x_currency: currency || "USD",
        x_supplier_invoice_number: supplierId || false,
        ...(base64Image && { image_1920: base64Image }),
      },
    ]);

    // ✅ Sync attributes
    const finalColors: string[] = attributes?.colors ?? [];
    const finalSizes: string[] = attributes?.sizes ?? [];
    const finalMaterials: string[] = attributes?.materials ?? [];

    for (const [key, values] of [
      ["colors", finalColors],
      ["sizes", finalSizes],
      ["materials", finalMaterials],
    ] as [string, string[]][]) {
      const odooAttributeName = ATTRIBUTE_NAME_MAP[key];
      const attributeId = await createOrGetAttribute(odooAttributeName);
      const valueIds: number[] = [];
      for (const val of values) {
        const valId = await createAttributeValue(attributeId, val);
        valueIds.push(valId);
      }
      await syncAttributeLine(Number(id), attributeId, valueIds);
    }

    // ✅ Track verified stock from Odoo
    let verifiedStock: number = stock !== undefined ? Number(stock) : 0;

// ✅ Update stock via stock.quant
if (stock !== undefined && stock !== null) {

  // 1. Get the variant(s) for this template
  const variants = await odooRequest(
    "product.product",
    "search_read",
    [[["product_tmpl_id", "=", Number(id)], ["active", "=", true]]],
    { fields: ["id", "display_name"] }
  );

  if (!variants.length) {
    throw new Error(`No active variant found for template ID ${id}`);
  }

  if (variants.length > 1) {
    console.warn(
      `⚠️ Template ${id} has ${variants.length} variants — updating ALL of them with stock=${stock}. ` +
      `This is likely wrong if variants should have independent stock.`
    );
  }

  // 2. Get the CORRECT stock location — the warehouse's actual stock location,
  //    not just "any internal location" (which was the bug)
  const warehouses = await odooRequest(
    "stock.warehouse",
    "search_read",
    [[]],
    { fields: ["id", "lot_stock_id", "name"], limit: 1 }
  );

  if (!warehouses.length || !warehouses[0].lot_stock_id) {
    throw new Error("Could not resolve warehouse stock location in Odoo");
  }

  const stockLocationId = warehouses[0].lot_stock_id[0];
  console.log(`📍 Using stock location: ${warehouses[0].lot_stock_id[1]} (id=${stockLocationId})`);

  // 3. Apply stock to each variant at the correct location
  for (const v of variants) {
    const existingQuants = await odooRequest(
      "stock.quant",
      "search_read",
      [
        [
          ["product_id", "=", v.id],
          ["location_id", "=", stockLocationId],
        ],
      ],
      { fields: ["id", "quantity"], limit: 1 }
    );

    let quantId: number;

    if (existingQuants.length) {
      quantId = existingQuants[0].id;
      await odooRequest("stock.quant", "write", [
        [quantId],
        { inventory_quantity: Number(stock),quantity: Number(stock) },
      ]);
      console.log(`✅ Quant ${quantId} updated for variant ${v.id} (${v.display_name})`);
    } else {
      quantId = await odooRequest("stock.quant", "create", [
        {
          product_id: v.id,
          location_id: stockLocationId,
          inventory_quantity: Number(stock),
        },
      ]);
      console.log(`✅ Quant ${quantId} created for variant ${v.id} (${v.display_name})`);
    }

    await odooRequest("stock.quant", "action_apply_inventory", [[quantId]]);

    // 4. Verify against the SAME id/location we just wrote to
    const verifiedQuant = await odooRequest(
      "stock.quant",
      "search_read",
      [[["id", "=", quantId]]],
      { fields: ["quantity", "location_id", "product_id"], limit: 1 }
    );

    if (!verifiedQuant.length) {
      throw new Error(`Could not find stock quant ID ${quantId} after apply`);
    }

    console.log(
      `🔍 Verified quant ${quantId}: product=${verifiedQuant[0].product_id}, ` +
      `location=${verifiedQuant[0].location_id}, qty=${verifiedQuant[0].quantity}`
    );

    const actualQty = verifiedQuant[0].quantity;
    if (Math.abs(actualQty - Number(stock)) > 0.01) {
      throw new Error(
        `Odoo stock mismatch: expected ${stock}, got ${actualQty} for variant ${v.id}`
      );
    }
  }

  verifiedStock = Number(stock);
}

    // ✅ Update supplier info in Odoo
    if (supplierName || supplierId) {
      const suppliers = await odooRequest(
        "res.partner",
        "search_read",
        [
          [
            "|",
            ["name", "=", supplierName || ""],
            ["ref", "=", supplierId || ""],
          ],
        ],
        { fields: ["id"], limit: 1 }
      );

      let resolvedSupplierId: number;
      if (suppliers.length) {
        resolvedSupplierId = suppliers[0].id;
      } else {
        resolvedSupplierId = await odooRequest("res.partner", "create", [
          {
            name: supplierName || "Unknown Supplier",
            ref: supplierId || false,
            supplier_rank: 1,
          },
        ]);
      }

      const existingSupplierInfo = await odooRequest(
        "product.supplierinfo",
        "search_read",
        [
          [
            ["product_tmpl_id", "=", Number(id)],
            ["partner_id", "=", resolvedSupplierId],
          ],
        ],
        { fields: ["id"], limit: 1 }
      );

      if (existingSupplierInfo.length) {
        await odooRequest("product.supplierinfo", "write", [
          [existingSupplierInfo[0].id],
          {
            price: Number(supplierPrice) || 0,
            product_code: supplierId || false,
          },
        ]);
      } else {
        await odooRequest("product.supplierinfo", "create", [
          {
            product_tmpl_id: Number(id),
            partner_id: resolvedSupplierId,
            price: Number(supplierPrice) || 0,
            product_code: supplierId || false,
          },
        ]);
      }
    }

    // ✅ Build response straight from what we just verified in Odoo
    const XCD_RATES: Record<string, number> = { USD: 2.7, EUR: 2.9 };
    const rate = XCD_RATES[currency ?? "USD"] ?? 2.7;
    const finalPriceXCD =
      ((Number(supplierPrice) || 0) + (Number(shippingCost) || 0)) * rate;

    res.json({
      success: true,
      message: "Product updated successfully",
      product: {
        odooProductId: Number(id),
        name,
        reference: reference || "",
        itemNumber: itemNumber || "",
        barcode: barcode || "",
        price: Number(price) || 0,
        stock: verifiedStock,
        supplierId: supplierId || "",
        supplierName: supplierName || "",
        supplierPrice: Number(supplierPrice) || 0,
        shippingCost: Number(shippingCost) || 0,
        currency: currency || "USD",
        finalPriceXCD,
        location: {
          warehouseName: warehouseName || "",
          shelfName: shelfName || "",
        },
        attributes: {
          colors: finalColors,
          sizes: finalSizes,
          materials: finalMaterials,
        },
        image: imageUrl || undefined,
      },
    });
  } catch (err: any) {
    console.error("❌ updateProduct error:", err.message);
    res.status(500).json({ message: err.message });
  }
};
// delete product
export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // ✅ Archive instead of delete (safe when stock moves exist)
    await odooRequest("product.template", "write", [
      [Number(id)],
      { active: false },
    ]);

    // Also remove from MongoDB
    await Product.findOneAndDelete({ odooProductId: Number(id) });

    res.json({
      success: true,
      message: "Product archived successfully",
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const getPurchasedProducts = async (req: Request, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    // ✅ USE USER ID DIRECTLY (NO findOne)
    const orders = await Order.find({
      userId: user._id,
      paymentStatus: "paid",
    });

    if (!orders.length) {
      return res.status(200).json([]); // better than 404
    }

    const result = [];

    for (const order of orders) {
      for (const item of order.items) {
        const product = await odooRequest(
          "product.product",
          "search_read",
          [[["id", "=", item.productId]]],
          {
            fields: ["id", "name", "image_1920", "list_price"],
          },
        );

        const prod = product?.[0];

        result.push({
          orderId: order._id,
          status: order.status,

          quantity: item.quantity,
          price: item.price,
          variant: item.variantInfo,

          product: prod
            ? {
                id: prod.id,
                name: prod.name,
                price: prod.list_price,
                image: prod.image_1920
                  ? `data:image/png;base64,${prod.image_1920}`
                  : null,
              }
            : null,
        });
      }
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching purchased products:", error);
    return res.status(500).json({
      message: "Failed to fetch purchased products",
    });
  }
};

// order.controller.ts
export const getTopSellingProducts = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const lines = await odooRequest(
        "sale.order.line",
        "search_read",
        [[["order_id.state", "in", ["sale", "done"]]]],
        {
          fields: ["product_id", "product_uom_qty", "price_subtotal"],
        },
      );

      // Group by product
      const productMap: {
        [key: number]: {
          id: number;
          name: string;
          totalQty: number;
          totalRevenue: number;
        };
      } = {};

      for (const line of lines) {
        if (!line.product_id) continue;
        const [id, name] = line.product_id;

        if (!productMap[id]) {
          productMap[id] = { id, name, totalQty: 0, totalRevenue: 0 };
        }

        productMap[id].totalQty += line.product_uom_qty || 0;
        productMap[id].totalRevenue += line.price_subtotal || 0;
      }

      const topProducts = Object.values(productMap)
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, 10)
        .map((p) => ({
          ...p,
          totalRevenue: parseFloat(p.totalRevenue.toFixed(2)),
        }));

      res.status(200).json({ success: true, topProducts });
    } catch (error: any) {
      return next(new ErrorHandler(`Odoo error: ${error.message}`, 500));
    }
  },
);

// product.controller.ts
export const getLowStockAlerts = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const threshold = Number(req.query.threshold) || 5;

      const products = await odooRequest(
        "product.template",
        "search_read",
        [
          [
            ["qty_available", "<=", threshold],
            ["active", "=", true],
          ],
        ],
        {
          fields: ["name", "default_code", "qty_available", "list_price"],
          order: "qty_available asc",
        },
      );

      res.status(200).json({
        success: true,
        count: products.length,
        products,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  },
);

// Barcode
export const getProductByBarcode = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { code } = req.params;

    const product = await odooRequest(
      "product.template",
      "search_read",
      [["|", ["barcode", "=", code], ["default_code", "=", code]]], // ✅ OR condition
      {
        fields: [
          "id",
          "name",
          "list_price",
          "barcode",
          "default_code",
          "qty_available",
        ],
        limit: 1,
      },
    );

    if (!product.length) {
      return next(new ErrorHandler("Product not found", 404));
    }

    res.status(200).json({ success: true, product: product[0] });
  },
);



// Product History
export const getProductHistory = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const templateId = Number(req.params.id);
      if (!templateId) return next(new ErrorHandler("Invalid product id", 400));

      // 1. Get all variants for this template
      const variants = await odooRequest(
        "product.product",
        "search_read",
        [[["product_tmpl_id", "=", templateId]]],
        { fields: ["id"] }
      );

      const variantIds = variants.map((v: any) => v.id);
      if (!variantIds.length) {
        return res.json({ success: true, stockMoves: [], salesHistory: [] });
      }

      // 2. Stock movements
      const moves = await odooRequest(
        "stock.move",
        "search_read",
        [
          [
            ["product_id", "in", variantIds],
            ["state", "=", "done"],
          ],
        ],
        {
          fields: [
            "date",
            "create_date",   // when record was inserted
            "write_date",    // when record was last modified
            "product_qty",
            "location_id",
            "location_dest_id",
            "origin",
            "reference",
            "picking_type_id",
          ],
          order: "create_date desc",
          limit: 50,
        }
      );

      const stockMoves = moves.map((m: any) => {
        let type: "restock" | "sale" | "return" | "adjustment" = "adjustment";
        const ref: string = (m.reference ?? m.origin ?? "").toLowerCase();
        const from: string = (m.location_id?.[1] ?? "").toLowerCase();
        const to: string = (m.location_dest_id?.[1] ?? "").toLowerCase();

        if (ref.includes("pos/") || ref.includes("wh/pos") || ref.includes("sale")) {
          type = "sale";
        } else if (ref.includes("return") || ref.includes("ret/")) {
          type = "return";
        } else if (ref.includes("wh/in") || ref.includes("receipt")) {
          type = "restock";
        } else if (
          // Inventory adjustment flowing INTO a warehouse = restock
          from.includes("inventory adjustment") &&
          (to.includes("stock") || to.includes("warehouse"))
        ) {
          type = "restock";
        }

        return {
          movementDate: m.date,        // physical move date
          insertedDate: m.create_date, // when it was recorded
          lastModified: m.write_date,  // when it was last changed
          qty: m.product_qty,
          type,
          reference: m.reference || m.origin || "—",
          from: m.location_id?.[1] ?? "—",
          to: m.location_dest_id?.[1] ?? "—",
        };
      });

      // 3. POS sales history
      const posLines = await odooRequest(
        "pos.order.line",
        "search_read",
        [[["product_id", "in", variantIds]]],
        {
          fields: ["qty", "price_subtotal", "order_id", "create_date"],
          order: "create_date desc",
          limit: 50,
        }
      );

      const orderIds = [...new Set(posLines.map((l: any) => l.order_id[0]))];
      const orders =
        orderIds.length > 0
          ? await odooRequest(
              "pos.order",
              "search_read",
              [[["id", "in", orderIds]]],
              { fields: ["id", "name", "date_order"] }
            )
          : [];

      const orderMap: Record<number, { name: string; date: string }> = {};
      for (const o of orders) {
        orderMap[o.id] = { name: o.name, date: o.date_order };
      }

      const salesHistory = posLines.map((l: any) => ({
        date: orderMap[l.order_id[0]]?.date ?? l.create_date,
        orderId: orderMap[l.order_id[0]]?.name ?? `#${l.order_id[0]}`,
        qty: l.qty,
        total: parseFloat((l.price_subtotal ?? 0).toFixed(2)),
      }));

      // 4. Last restock summary
      const lastRestock = stockMoves.find((m:any) => m.type === "restock") ?? null;

      return res.json({
        success: true,
        lastRestock: lastRestock
          ? { date: lastRestock.insertedDate, qty: lastRestock.qty }
          : null,
        stockMoves,
        salesHistory,
      });
    } catch (err: any) {
      return next(new ErrorHandler(err.message, 500));
    }
  }
);
