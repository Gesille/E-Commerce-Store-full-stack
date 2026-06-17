import mongoose, { Schema, Document, Model } from "mongoose";

export interface IProduct extends Document {
  name: string;
  reference: string;
  itemNumber: string;
  supplierInvoiceNumber:string,
  price: number;
  stock: number;
  image?: string;
  barcode: string;
  attributes: {
    colors: string[];
    sizes: string[];
    materials: string[];
  };
  location: {
  
    warehouseName?: string;
 odooLocationId?: number | null;
    shelfName?: string;
  };
  supplierPrice?: number;
  shippingCost?: number;
  currency?: string;
  finalPriceXCD?: number;
  supplierId?: string;
  supplierName?: string;
  odooProductId: number;
  odooCategoryId?: number;
}
const productSchema: Schema<IProduct> = new Schema(
  {
    name: { type: String, required: true },
    reference: { type: String, default: "" },
    itemNumber: { type: String, default: "" },
    supplierInvoiceNumber: { type: String, default: "" },
    price: { type: Number, required: true },        
    stock: { type: Number, required: true },
    image: { type: String },
    barcode: { type: String },
    attributes: {
      colors: [{ type: String }],
      sizes: [{ type: String }],
      materials: [{ type: String }],
    },
    location: {
     
      warehouseName: { type: String },
      odooLocationId: { type: Number }, 
      shelfName: { type: String },
    },
    supplierPrice: { type: Number },
    shippingCost: { type: Number, default: 0 },
    currency: { type: String, default: "USD" },
    finalPriceXCD: { type: Number },
     supplierId: { type: String },  
    supplierName: { type: String },
    odooProductId: { type: Number, required: true },
    odooCategoryId: { type: Number },
  },
  { timestamps: true }
);

const Product: Model<IProduct> =
  mongoose.models.Product || mongoose.model("Product", productSchema);

export default Product;