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
import axios from "axios"
import cloudinary from "cloudinary";
import { uploadImage } from "../utils/uploadImages.js";
import userModel from "../models/user.model.js";
import Order from "../models/order.model.js";

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
  }
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
  }
);

export const getProductByIdFromOdoo = async (req:Request, res:Response, next:NextFunction) => {
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

const createOrGetAttribute = async (name: string) => {
  const result = await odooRequest("product.attribute", "search_read", [
    [["name", "=", name]],
  ]);

  if (result.length) return result[0].id;

  return await odooRequest("product.attribute", "create", [
    { name,
      create_variant: "always", 
     },
  ]);
};

const createAttributeValue = async (attributeId: number, value: string) => {
  const result = await odooRequest("product.attribute.value", "search_read", [
    [["name", "=", value]],
  ]);

  if (result.length) return result[0].id;

  return await odooRequest("product.attribute.value", "create", [
    {
      name: value,
      attribute_id: attributeId,
    },
  ]);
};

const createAttributeLines = async (
  productTemplateId: number,
  attributeId: number,
  valueIds: number[]
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
    const { name, price, stock, categoryId, image, attributes, reference } = req.body; // ✅ add reference

    let base64Image = null;
    if (image) {
      base64Image = await toBase64(image);
    }

    createdProductTemplateId = await odooRequest(
      "product.template",
      "create",
      [
        {
          name,
          list_price: price,
          default_code: reference || false,  // ✅ Odoo field for reference/SKU
          type: "consu",
          is_storable: true,
          active: true,
          sale_ok: true,
          purchase_ok: true,
          categ_id: categoryId,
          image_1920: base64Image || false,
        },
      ]
    );

    if (!createdProductTemplateId) {
      throw new Error("Failed to retrieve Product Template ID from Odoo.");
    }

    if (attributes) {
      for (const key in attributes) {
        const attributeId = await createOrGetAttribute(key);
        const values = Array.isArray(attributes[key]) ? attributes[key] : [attributes[key]];
        const valueIds = [];
        for (const val of values) {
          const id = await createAttributeValue(attributeId, val);
          valueIds.push(id);
        }
        await createAttributeLines(createdProductTemplateId!, attributeId, valueIds);
      }
    }

    const variant = await odooRequest(
      "product.product",
      "search_read",
      [[["product_tmpl_id", "=", createdProductTemplateId]]],
      { fields: ["id"], limit: 1 }
    );

    if (!variant || variant.length === 0) {
      throw new Error("Could not find product variant.");
    }

    const productId = variant[0].id;

    const locations = await odooRequest(
      "stock.location",
      "search_read",
      [[["usage", "=", "internal"]]],
      { fields: ["id"], limit: 1 }
    );

    const locationId = locations[0].id;

    const quantId = await odooRequest("stock.quant", "create", [
      {
        product_id: productId,
        location_id: locationId,
        inventory_quantity: Number(stock),
      },
    ]);

    await odooRequest("stock.quant", "action_apply_inventory", [[quantId]]);

    // ✅ Save to MongoDB with reference
    await Product.create({
      name,
      reference: reference || "",
      price: Number(price),
      stock: Number(stock),
      image: image || "",
      attributes: {
        colors: attributes?.colors ?? [],
        sizes: attributes?.sizes ?? [],
        materials: attributes?.materials ?? [],
      },
      odooProductId: createdProductTemplateId,
      odooCategoryId: categoryId,
    });

    res.json({
      success: true,
      productTemplateId: createdProductTemplateId,
      productId,
    });

  } catch (err: any) {
    console.error("Odoo Logic Failed:", err.message);

    if (createdProductTemplateId) {
      await odooRequest("product.template", "unlink", [[createdProductTemplateId]]).catch(e => {
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
  const locations = await odooRequest(
    "stock.location",
    "search_read",
    [],
    { fields: ["id", "usage"] }
  );

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
    const { name, price, stock, colors, sizes, materials,reference  } = req.body;
const exists = await odooRequest(
      "product.template",
      "search_read",
      [[["id", "=", Number(id)]]],
      { fields: ["id", "name"] }
    );
    console.log("Found in Odoo:", exists); 

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
        ...(base64Image && { image_1920: base64Image }),
      },
    ]);

    // ✅ Update MongoDB
    const updated = await Product.findOneAndUpdate(
      { odooProductId: Number(id) },
      {
        name,
        reference: reference || "", 
        price,
        stock,
        ...(imageUrl && { image: imageUrl }),
        attributes: {
          colors: colors ?? [],
          sizes: sizes ?? [],
          materials: materials ?? [],
        },
      },
      { new: true, upsert: true }
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
          }
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
        }
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
  }
);



// product.controller.ts
export const getLowStockAlerts = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const threshold = Number(req.query.threshold) || 5;

      const products = await odooRequest(
        "product.template",
        "search_read",
        [[["qty_available", "<=", threshold], ["active", "=", true]]],
        {
          fields: ["name", "default_code", "qty_available", "list_price"],
          order: "qty_available asc",
        }
      );

      res.status(200).json({
        success: true,
        count: products.length,
        products,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);