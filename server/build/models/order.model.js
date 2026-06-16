import mongoose, { Schema } from "mongoose";
const OrderSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    address: {
        type: Schema.Types.ObjectId,
        ref: "Address",
        required: false,
    },
    shippingAddress: {
        name: { type: String },
        email: { type: String },
        phone: { type: String },
        city: { type: String },
        address: { type: String },
    },
    items: [
        {
            productId: { type: Number, required: true },
            quantity: { type: Number, required: true },
            price: { type: Number, required: true },
            name: { type: String },
            variantInfo: {
                color: String,
                size: String,
            },
        },
    ],
    total: { type: Number, required: true },
    status: {
        type: String,
        enum: ["pending", "confirmed", "delivering", "done", "cancelled"],
        default: "pending",
    },
    odooSaleOrderId: {
        type: Number,
        default: null,
    },
    paymentStatus: {
        type: String,
        enum: ["unpaid", "paid"],
        default: "unpaid",
    },
    odooPartnerId: {
        type: Number,
    },
    expiresAt: {
        type: Date,
        default: null,
    },
}, { timestamps: true });
export default mongoose.model("Order", OrderSchema);
