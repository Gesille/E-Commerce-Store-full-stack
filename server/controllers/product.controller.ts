import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncError.js";
import ErrorHandler from "../utils/ErrorHandler.js";
import {
  checkOdooConnection,
  getAllProductsService,
  getProductByIdService,
} from "../services/product.service.js";
import { odooRequest } from "../odoo/odoo.client.js";
import Product from "../models/product.model.js";
import axios from "axios";

import Order from "../models/order.model.js";
import cloudinary, { uploadImage } from "../utils/uploadImages.js";

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
  // Exact match only — never ilike
  const existing = await odooRequest(
    "product.attribute",
    "search_read",
    [[["name", "=", name]]],
    { fields: ["id", "name"], limit: 1 }
  );

  if (existing[0]) return existing[0].id;

  // Create if not found
  return await odooRequest("product.attribute", "create", [{ name }]);
};

const createAttributeValue = async (
  attributeId: number,
  value: string
): Promise<number> => {
  // MUST scope by attribute_id — otherwise finds "Small" from a different attribute
  const existing = await odooRequest(
    "product.attribute.value",
    "search_read",
    [[["attribute_id", "=", attributeId], ["name", "=", value]]],
    { fields: ["id", "name"], limit: 1 }
  );

  if (existing[0]) return existing[0].id;

  // Create scoped to this attribute
  return await odooRequest("product.attribute.value", "create", [
    { attribute_id: attributeId, name: value },
  ]);
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

export const createProduct = async (req: Request, res: Response) => {
  let createdProductTemplateId: number | null = null;

  try {
    const {
      name,
      price,
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
      supplierPrice,
      shippingCost,
      currency,
      supplierId,
      supplierName,
    } = req.body;

    // ── XCD price calculation ─────────────────────────────────────────────
    const XCD_RATES: Record<string, number> = { USD: 2.7, EUR: 2.9 };
    const rate = XCD_RATES[currency ?? "USD"] ?? 2.7;
    const finalPriceXCD =
      ((Number(supplierPrice) || 0) + (Number(shippingCost) || 0)) * rate;

    // ── Image ─────────────────────────────────────────────────────────────
    let base64Image = null;
    if (image) {
      base64Image = await toBase64(image);
    }

    // ── Create product template in Odoo ───────────────────────────────────
    createdProductTemplateId = await odooRequest("product.template", "create", [
      {
        name,
        list_price: price,
        default_code: itemNumber || reference || false,
        barcode: barcode || false,
        standard_price: Number(supplierPrice) || 0,
        type: "consu",
        is_storable: true,
        active: true,
        sale_ok: true,
        purchase_ok: true,
        categ_id: categoryId,
        image_1920: base64Image || false,
      },
    ]);

    if (!createdProductTemplateId) {
      throw new Error("Failed to retrieve Product Template ID from Odoo.");
    }

    // ── Supplier info ─────────────────────────────────────────────────────
    if (supplierId) {
      await odooRequest("product.supplierinfo", "create", [
        {
          product_tmpl_id: createdProductTemplateId,
          partner_id: 1,
          price: Number(supplierPrice) || 0,
          product_code: supplierId,
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

        // Skip empty arrays
        if (!values || values.length === 0) continue;

        const odooAttributeName = ATTRIBUTE_NAME_MAP[key] ?? key;
        const attributeId = await createOrGetAttribute(odooAttributeName);

        const valueIds = [];
        for (const val of values) {
          const id = await createAttributeValue(attributeId, val);
          valueIds.push(id);
        }

        await createAttributeLines(
          createdProductTemplateId!,
          attributeId,
          valueIds,
        );
      }
    }

    // ── Get product variant ───────────────────────────────────────────────
    const variant = await odooRequest(
      "product.product",
      "search_read",
      [[["product_tmpl_id", "=", createdProductTemplateId]]],
      { fields: ["id"], limit: 1 },
    );

    if (!variant || variant.length === 0) {
      throw new Error("Could not find product variant.");
    }

    const productId = variant[0].id;

    // ── Resolve location ──────────────────────────────────────────────────
    let resolvedLocationId: number | null = locationId ?? null;
    let resolvedShelfName = "";
    let resolvedWarehouseName = "";

    if (!resolvedLocationId) {

      // Step 1: exact match on shelf name
      if (shelfName) {
        const exact = await odooRequest(
          "stock.location",
          "search_read",
          [[["usage", "=", "internal"], ["name", "=", shelfName]]],
          { fields: ["id", "name", "complete_name"], limit: 1 },
        );
        if (exact[0]) resolvedLocationId = exact[0].id;
      }

      // Step 2: ilike on complete_name (catches "WH/Stock/Shelf A")
      if (!resolvedLocationId && shelfName) {
        const ilikeShelf = await odooRequest(
          "stock.location",
          "search_read",
          [
            [
              ["usage", "=", "internal"],
              ["complete_name", "ilike", shelfName],
            ],
          ],
          { fields: ["id", "name", "complete_name"], limit: 1 },
        );
        if (ilikeShelf[0]) resolvedLocationId = ilikeShelf[0].id;
      }

      // Step 3: fallback to warehouse name
      if (!resolvedLocationId && warehouseName) {
        const ilikeWH = await odooRequest(
          "stock.location",
          "search_read",
          [
            [
              ["usage", "=", "internal"],
              ["complete_name", "ilike", warehouseName],
            ],
          ],
          { fields: ["id", "name", "complete_name"], limit: 1 },
        );
        if (ilikeWH[0]) resolvedLocationId = ilikeWH[0].id;
      }

      // Step 4: last resort — first internal location in Odoo
      if (!resolvedLocationId) {
        const fallback = await odooRequest(
          "stock.location",
          "search_read",
          [[["usage", "=", "internal"]]],
          { fields: ["id", "name", "complete_name"], limit: 1 },
        );
        if (!fallback[0])
          throw new Error("No internal stock location found in Odoo.");
        resolvedLocationId = fallback[0].id;
      }
    }

    // Resolve display names from whichever ID we ended up with
    const locationRecord = await odooRequest(
      "stock.location",
      "search_read",
      [[["id", "=", resolvedLocationId]]],
      { fields: ["name", "complete_name"], limit: 1 },
    );

    if (locationRecord[0]) {
      const parts = (locationRecord[0].complete_name ?? "")
        .split("/")
        .map((p: string) => p.trim());
      resolvedWarehouseName = parts[0] ?? warehouseName ?? "";
      resolvedShelfName = parts[parts.length - 1] ?? shelfName ?? "";
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
  name,
  reference: reference || "",
  itemNumber: itemNumber || "",
  barcode: barcode || "",
  price: Number(price),
  stock: Number(stock),
  image: image || "",
  attributes: {
    colors: attributes?.colors ?? [],
    sizes: attributes?.sizes ?? [],
    materials: attributes?.materials ?? [],
  },
  location: {
    shelfName:      resolvedShelfName,      // ← resolved from Odoo, not user input
    warehouseName:  resolvedWarehouseName,  // ← resolved from Odoo, not user input
    odooLocationId: resolvedLocationId,
  },
  supplierPrice:  Number(supplierPrice) || 0,
  shippingCost:   Number(shippingCost) || 0,
  currency:       currency || "USD",
  finalPriceXCD,
  supplierId:     supplierId || null,       // string — invoice number like "INV-001"
  supplierName:   supplierName || "",       // ← this is what shows as "supplier" in response
  odooProductId:  createdProductTemplateId,
  odooCategoryId: categoryId,
});;

    // ── Response ──────────────────────────────────────────────────────────
    res.json({
      success: true,
      productTemplateId: createdProductTemplateId,
      productId,
      location: {
        id: resolvedLocationId,
        shelfName: resolvedShelfName,
        warehouseName: resolvedWarehouseName,
      },
    });
  } catch (err: any) {
    console.error("Odoo Logic Failed:", err.message);

    // Rollback — delete the Odoo product if anything failed after creation
    if (createdProductTemplateId) {
      await odooRequest("product.template", "unlink", [
        [createdProductTemplateId],
      ]).catch((e) => {
        console.error("Critical: Cleanup failed!", e.message);
      });
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
    console.log("Schema paths:", Object.keys(Product.schema.paths));
    console.log("odooProductId type:", Product.schema.path("odooProductId"));
    const raw = await Product.collection.findOne({ odooProductId: Number(id) });
    console.log("Raw result:", raw);
    const { name, price, stock, colors, sizes, materials, reference, barcode } =
      req.body;
    const exists = await odooRequest(
      "product.template",
      "search_read",
      [[["id", "=", Number(id)]]],
      { fields: ["id", "name"] },
    );

    let imageUrl = null;
    let base64Image = null;

    if (req.body.image) {
      // 1. Upload to Cloudinary
      const uploaded = await uploadImage(req.body.image);

      imageUrl = uploaded.url;

      // 2. Convert to base64 for Odoo
      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer",
      });

      base64Image = Buffer.from(response.data, "binary").toString("base64");
    }

    // ✅ Update in Odoo
    await odooRequest("product.template", "write", [
      [Number(id)],
      {
        name,
        list_price: Number(price),
        qty_available: stock,
        default_code: reference || false,
        barcode: barcode || false,
        ...(base64Image && { image_1920: base64Image }),
      },
    ]);

    const updated = await Product.findOneAndUpdate(
      { odooProductId: Number(id) },
      {
        $set: {
          name,
          reference: reference || "",
          barcode: barcode || false,
          price: Number(price),
          stock: Number(stock),
          ...(imageUrl && { image: imageUrl }),
          attributes: {
            colors: colors ?? [],
            sizes: sizes ?? [],
            materials: materials ?? [],
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
