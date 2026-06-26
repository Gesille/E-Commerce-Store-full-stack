import mongoose, { Schema, Document } from "mongoose";

// ─── Interface ────────────────────────────────────────────────────────────────
export interface IProduct extends Document {
  // Identity
  name: string;
  reference: string;
  itemNumber: string;
  barcode: string;
  price: number;
  stock: number;
  image: string;
  attributes: {
    colors: string[];
    sizes: string[];
    materials: string[];
  };

  // Location
  location: {
    shelfName: string;
    warehouseName: string;
    odooLocationId: number | null;
  };

  // Pricing
  currency: "USD" | "EUR";
  supplierPrice: number;
  shippingCost: number;
  markup: number;



 

  // Calculated (auto by backend)
  buyPriceXCD: number;
  totalCostsXCD: number;
  landedCostXCD: number;
  finalPriceXCD: number;

  // Supplier
  supplierId: string;
  supplierName: string;

  // Odoo refs
  odooProductId: number | null;
  odooCategoryId: number | null;

  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────
const ProductSchema = new Schema<IProduct>(
  {
    // ── Identity ────────────────────────────────────────────────────────────
    name:       { type: String, required: true, trim: true },
    reference:  { type: String, default: "" },
    itemNumber: { type: String, default: "" },
    barcode:    { type: String, default: "" },
    price:      { type: Number, default: 0 },
    stock:      { type: Number, default: 0 },
    image:      { type: String, default: "" },
    attributes: {
      colors:    { type: [String], default: [] },
      sizes:     { type: [String], default: [] },
      materials: { type: [String], default: [] },
    },

    // ── Location ────────────────────────────────────────────────────────────
    location: {
      shelfName:      { type: String, default: "" },
      warehouseName:  { type: String, default: "" },
      odooLocationId: { type: Number, default: null },
    },

    // ── Pricing ─────────────────────────────────────────────────────────────
    currency:      { type: String, enum: ["USD", "EUR"], default: "USD" },
    supplierPrice: { type: Number, default: 0 },
    shippingCost:  { type: Number, default: 0 },
    markup:        { type: Number, default: 1 },

   
    // ── Calculated (never sent from client, always computed by backend) ──────
    buyPriceXCD:   { type: Number, default: 0 },
    totalCostsXCD: { type: Number, default: 0 },
    landedCostXCD: { type: Number, default: 0 },
    finalPriceXCD: { type: Number, default: 0 },

    // ── Supplier ────────────────────────────────────────────────────────────
    supplierId:   { type: String, default: "" },
    supplierName: { type: String, default: "" },

    // ── Odoo refs ───────────────────────────────────────────────────────────
    odooProductId:  { type: Number, default: null },
    odooCategoryId: { type: Number, default: null },
  },
  {
    timestamps: true,   // adds createdAt + updatedAt automatically
    versionKey: false,
  }
);

// ── Indexes ──────────────────────────────────────────────────────────────────
ProductSchema.index({ name: "text", reference: "text", barcode: "text" });
ProductSchema.index({ odooProductId: 1 }, { sparse: true });
ProductSchema.index({ supplierId: 1 }, { sparse: true });
ProductSchema.index({ odooCategoryId: 1 });

export const Product = mongoose.model<IProduct>("Product", ProductSchema);