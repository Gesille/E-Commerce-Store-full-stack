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

  // International Costs (XCD)
  freightInternational: number;
  transportationStorageInternational: number;
  portFeesInternational: number;
  brokerageHandlingInternational: number;
  customsDutiesInternational: number;
  tariffsInternational: number;
  insurancesInternational: number;
  vatTaxesInternational: number;
  currencyConversion: number;
  paymentProcessing: number;
  bankCharges: number;

  // Local Costs (XCD)
  freightLocal: number;
  transportationStorageLocal: number;
  portFeesLocal: number;
  brokerageHandlingLocal: number;
  customsDutiesLocal: number;
  tariffsLocal: number;
  insurancesLocal: number;
  vatTaxesLocal: number;
  documentationCosts: number;
  internalFees: number;

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

    // ── International Costs (XCD) ───────────────────────────────────────────
    freightInternational:               { type: Number, default: 0 },
    transportationStorageInternational: { type: Number, default: 0 },
    portFeesInternational:              { type: Number, default: 0 },
    brokerageHandlingInternational:     { type: Number, default: 0 },
    customsDutiesInternational:         { type: Number, default: 0 },
    tariffsInternational:               { type: Number, default: 0 },
    insurancesInternational:            { type: Number, default: 0 },
    vatTaxesInternational:              { type: Number, default: 0 },
    currencyConversion:                 { type: Number, default: 0 },
    paymentProcessing:                  { type: Number, default: 0 },
    bankCharges:                        { type: Number, default: 0 },

    // ── Local Costs (XCD) ───────────────────────────────────────────────────
    freightLocal:               { type: Number, default: 0 },
    transportationStorageLocal: { type: Number, default: 0 },
    portFeesLocal:              { type: Number, default: 0 },
    brokerageHandlingLocal:     { type: Number, default: 0 },
    customsDutiesLocal:         { type: Number, default: 0 },
    tariffsLocal:               { type: Number, default: 0 },
    insurancesLocal:            { type: Number, default: 0 },
    vatTaxesLocal:              { type: Number, default: 0 },
    documentationCosts:         { type: Number, default: 0 },
    internalFees:               { type: Number, default: 0 },

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