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
      // Identity
      name,
      stock,
      categoryId,
      image,
      attributes,
      reference,
      barcode,
      itemNumber,

      // Location
      locationId,
      warehouseName,
      shelfName,

      // Supplier
      supplierId,
      supplierName,

      // Pricing inputs
      supplierPrice,
      currency,
      markup,

      // International Costs (XCD) — note: NO separate shippingCost; use freightInternational
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

      // Local Costs (XCD)
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

    // ── Landed cost calculation (matches Excel exactly) ───────────────────
    const { buyPriceXCD, totalCostsXCD, landedCostXCD, finalPriceXCD, exchangeRate } =
      calcLandedCost(req.body);

    // ── Image ─────────────────────────────────────────────────────────────
    let base64Image: string | null = null;
    if (image) base64Image = await toBase64(image);

    // ── Create product template in Odoo ───────────────────────────────────
    // list_price  → finalPriceXCD  (calculated selling price, not a manual input)
    // standard_price → buyPriceXCD (cost in XCD for Odoo's margin reports)
    createdProductTemplateId = await odooRequest("product.template", "create", [
      {
        name,
        list_price: parseFloat(finalPriceXCD.toFixed(2)),       // ← selling price from calc
        standard_price: parseFloat(buyPriceXCD.toFixed(2)),     // ← cost in XCD
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
          price: Number(supplierPrice) || 0,         // supplier's price in original currency
          product_code: supplierId || false,
        },
      ]);
    }

    // ── Attributes ────────────────────────────────────────────────────────
    const ATTRIBUTE_NAME_MAP: Record<string, string> = {
      colors: "Color",
      sizes: "Size",
      materials: "Material",
    };

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

    // ── Save to MongoDB ───────────────────────────────────────────────────
    await Product.create({
      // Identity
      name,
      reference: reference || "",
      itemNumber: itemNumber || "",
      barcode: barcode || "",
      price: parseFloat(finalPriceXCD.toFixed(2)),  // stored as the final calculated price
      stock: Number(stock),
      image: image || "",
      attributes: {
        colors: attributes?.colors ?? [],
        sizes: attributes?.sizes ?? [],
        materials: attributes?.materials ?? [],
      },

      // Location
      location: {
        shelfName: resolvedShelfName,
        warehouseName: resolvedWarehouseName,
        odooLocationId: resolvedLocationId,
      },

      // Pricing inputs
      currency: currency || "USD",
      supplierPrice: Number(supplierPrice) || 0,
      markup: Number(markup) || 1,

      // International Costs
      freightInternational: Number(freightInternational) || 0,
      transportationStorageInternational: Number(transportationStorageInternational) || 0,
      portFeesInternational: Number(portFeesInternational) || 0,
      brokerageHandlingInternational: Number(brokerageHandlingInternational) || 0,
      customsDutiesInternational: Number(customsDutiesInternational) || 0,
      tariffsInternational: Number(tariffsInternational) || 0,
      insurancesInternational: Number(insurancesInternational) || 0,
      vatTaxesInternational: Number(vatTaxesInternational) || 0,
      currencyConversion: Number(currencyConversion) || 0,
      paymentProcessing: Number(paymentProcessing) || 0,
      bankCharges: Number(bankCharges) || 0,

      // Local Costs
      transportationStorageLocal: Number(transportationStorageLocal) || 0,
      portFeesLocal: Number(portFeesLocal) || 0,
      brokerageHandlingLocal: Number(brokerageHandlingLocal) || 0,
      customsDutiesLocal: Number(customsDutiesLocal) || 0,
      tariffsLocal: Number(tariffsLocal) || 0,
      insurancesLocal: Number(insurancesLocal) || 0,
      vatTaxesLocal: Number(vatTaxesLocal) || 0,
      documentationCosts: Number(documentationCosts) || 0,
      internalFees: Number(internalFees) || 0,

      // Calculated (never from client)
      buyPriceXCD: parseFloat(buyPriceXCD.toFixed(2)),
      totalCostsXCD: parseFloat(totalCostsXCD.toFixed(2)),
      landedCostXCD: parseFloat(landedCostXCD.toFixed(2)),
      finalPriceXCD: parseFloat(finalPriceXCD.toFixed(2)),

      // Supplier
      supplierId: supplierId || "",
      supplierName: supplierName || "",

      // Odoo refs
      odooProductId: createdProductTemplateId,
      odooCategoryId: categoryId,
    });

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

    // ✅ Update Odoo — all fields including custom ones
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

    // ✅ Update stock via stock.quant (fixed — removed invalid inventory_quantity_auto_apply)
    if (stock !== undefined && stock !== null) {
      const variant = await odooRequest(
        "product.product",
        "search_read",
        [[["product_tmpl_id", "=", Number(id)]]],
        { fields: ["id"], limit: 1 },
      );

      if (!variant.length) {
        throw new Error(`No product variant found for template ID ${id}`);
      }

      const locations = await odooRequest(
        "stock.location",
        "search_read",
        [[["usage", "=", "internal"], ["company_id", "!=", false]]],
        { fields: ["id", "name"], limit: 1 },
      );

      if (!locations.length) {
        throw new Error("No internal stock location found in Odoo");
      }

      const existingQuants = await odooRequest(
        "stock.quant",
        "search_read",
        [
          [
            ["product_id", "=", variant[0].id],
            ["location_id", "=", locations[0].id],
          ],
        ],
        { fields: ["id"], limit: 1 },
      );

      let quantId: number;

      if (existingQuants.length) {
        quantId = existingQuants[0].id;

        // ✅ Only set inventory_quantity — no fake fields
        await odooRequest("stock.quant", "write", [
          [quantId],
          { inventory_quantity: Number(stock) },
        ]);

        console.log("✅ Existing quant updated, ID:", quantId);
      } else {
        // ✅ Create new quant
        quantId = await odooRequest("stock.quant", "create", [
          {
            product_id: variant[0].id,
            location_id: locations[0].id,
            inventory_quantity: Number(stock),
          },
        ]);

        console.log("✅ New quant created, ID:", quantId);
      }

      // ✅ Apply inventory adjustment — single call for both paths
      try {
        const applyResult = await odooRequest(
          "stock.quant",
          "action_apply_inventory",
          [[quantId]],
          {},
        );
        console.log("✅ Stock applied in Odoo, result:", JSON.stringify(applyResult));
      } catch (stockErr: any) {
        console.error("❌ Odoo stock apply failed:", stockErr.message);
        throw new Error(`Stock sync to Odoo failed: ${stockErr.message}`);
      }
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
        { fields: ["id"], limit: 1 },
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
        { fields: ["id"], limit: 1 },
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

    // ✅ Sync MongoDB — only after Odoo succeeds
    const XCD_RATES: Record<string, number> = { USD: 2.7, EUR: 2.9 };
    const rate = XCD_RATES[currency ?? "USD"] ?? 2.7;
    const finalPriceXCD =
      ((Number(supplierPrice) || 0) + (Number(shippingCost) || 0)) * rate;

    const updated = await Product.findOneAndUpdate(
      { odooProductId: Number(id) },
      {
        $set: {
          name,
          reference: reference || "",
          itemNumber: itemNumber || "",
          supplierInvoiceNumber: supplierId || "",
          barcode: barcode || false,
          price: Number(price) || 0,
          stock: Number(stock) || 0,
          supplierPrice: Number(supplierPrice) || 0,
          shippingCost: Number(shippingCost) || 0,
          currency: currency || "USD",
          finalPriceXCD,
          supplierId: supplierId || "",
          supplierName: supplierName || "",
          location: {
            warehouseName: warehouseName || "",
            shelfName: shelfName || "",
          },
          ...(imageUrl && { image: imageUrl }),
          attributes: {
            colors: finalColors,
            sizes: finalSizes,
            materials: finalMaterials,
          },
        },
      },
      { new: true },
    );

    res.json({
      success: true,
      message: "Product updated successfully",
      product: updated,
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
