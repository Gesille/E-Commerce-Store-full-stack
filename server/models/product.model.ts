import mongoose, { Schema, Document, Model } from "mongoose";

export interface IProduct extends Document {
  name: string;
  reference: string;
  price: number;
  stock: number;
  image?: string;

  attributes: {
    colors: string[];
    sizes: string[];
    materials: string[];
  };

  odooProductId: number;
  odooCategoryId?: number;
}

const productSchema: Schema<IProduct> = new Schema(
  {
    name: { type: String, required: true },
     reference: { type: String, default: "" },
    price: { type: Number, required: true },
    stock: { type: Number, required: true },

    image: { type: String },

    attributes: {
      colors: [{ type: String }],
      sizes: [{ type: String }],
      materials: [{ type: String }],
    },

    odooProductId: { type: Number, required: true },
    odooCategoryId: { type: Number },
  },
  { timestamps: true }
);

const Product: Model<IProduct> =
  mongoose.models.Product || mongoose.model("Product", productSchema);

export default Product;