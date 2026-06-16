import mongoose, { Schema } from "mongoose";
const cartItemSchema = new Schema({
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    qty: { type: Number, required: true, min: 1 },
    discount: { type: Number, default: 0, min: 0, max: 100 },
    barcode: { type: String },
    note: { type: String, default: "" },
}, { _id: false });
const paymentLineSchema = new Schema({
    method: {
        type: String,
        enum: ["cash", "card", "bank", "split"],
        required: true,
    },
    amount: { type: Number, required: true, min: 0 },
}, { _id: false });
const posOrderSchema = new Schema({
    sessionId: {
        type: Schema.Types.ObjectId,
        ref: "POSSession",
        required: true,
    },
    shiftId: {
        type: Schema.Types.ObjectId,
        ref: "CashierShiftLog",
        required: true,
    },
    cashierId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    openedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    odooOrderId: { type: Number, index: true, sparse: true },
    customerId: { type: Schema.Types.ObjectId, ref: "User" },
    customerName: { type: String },
    cart: { type: [cartItemSchema], required: true },
    paymentLines: { type: [paymentLineSchema], default: [] },
    subtotal: { type: Number, required: true },
    taxAmount: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    amountPaid: { type: Number, default: 0 },
    change: { type: Number, default: 0 },
    note: { type: String },
    status: {
        type: String,
        enum: ["draft", "paid", "refunded", "cancelled"],
        default: "paid",
    },
    receiptNumber: { type: String, required: true, unique: true },
}, { timestamps: true });
posOrderSchema.index({ sessionId: 1, createdAt: -1 });
posOrderSchema.index({ cashierId: 1, createdAt: -1 });
posOrderSchema.index({ shiftId: 1, status: 1 });
const POSOrder = mongoose.models.POSOrder ||
    mongoose.model("POSOrder", posOrderSchema);
export default POSOrder;
