import mongoose, { Schema } from "mongoose";
const productSchema = new Schema({
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
    barcode: { type: String },
    odooProductId: { type: Number, required: true },
    odooCategoryId: { type: Number },
}, { timestamps: true });
const Product = mongoose.models.Product || mongoose.model("Product", productSchema);
export default Product;
