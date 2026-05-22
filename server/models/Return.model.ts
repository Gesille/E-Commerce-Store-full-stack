import mongoose, { Schema, Document, Model } from "mongoose";


export interface IReturnItem {
  productId: number;
  name: string;
  sku: string;
  unitPrice: number;
  taxRate: number;
  qtyReturned: number;
  refundSubtotal: number;
  refundTax: number;
  refundTotal: number;
}

export interface IReturn extends Document {
  returnNumber: string;
  receiptNumber: string;
  odooOrderId?: number;
  cashier: string;
  cashierId?: mongoose.Types.ObjectId;
  reason: string;
  items: IReturnItem[];
  subtotal: number;
  taxTotal: number;
  total: number;
  paymentMethod: string;
  status: "completed" | "pending" | "voided";
  voidedBy?: string;
  voidedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReturnItemSchema = new Schema<IReturnItem>(
  {
    productId: { type: Number, required: true },
    name: { type: String, required: true },
    sku: { type: String, default: "" },
    unitPrice: { type: Number, required: true },
    taxRate: { type: Number, required: true, default: 0.1 },
    qtyReturned: { type: Number, required: true, min: 1 },
    refundSubtotal: { type: Number, required: true },
    refundTax: { type: Number, required: true },
    refundTotal: { type: Number, required: true },
  },
  { _id: false },
);


const ReturnSchema = new Schema<IReturn>(
  {
    returnNumber: { type: String, unique: true },
    receiptNumber: { type: String, required: true, index: true },
    odooOrderId: { type: Number },
    cashier: { type: String, required: true },
    cashierId: { type: Schema.Types.ObjectId, ref: "User" },
    reason: { type: String, required: true },
    items: { type: [ReturnItemSchema], required: true },
    subtotal: { type: Number, required: true },
    taxTotal: { type: Number, required: true },
    total: { type: Number, required: true },
    paymentMethod: { type: String, required: true },
    status: {
      type: String,
      enum: ["completed", "pending", "voided"],
      default: "completed",
    },
    voidedBy: { type: String },
    voidedAt: { type: Date },
    notes: { type: String },
  },
  { timestamps: true },
);


ReturnSchema.pre("save", async function (next) {
  if (this.isNew && !this.returnNumber) {
    const count = await mongoose.models.Return.countDocuments();
    const year = new Date().getFullYear();
    this.returnNumber = `RET-${year}-${String(count + 1).padStart(4, "0")}`;
  }
  next();
});


const Return: Model<IReturn> =
  mongoose.models.Return || mongoose.model<IReturn>("Return", ReturnSchema);

export default Return;