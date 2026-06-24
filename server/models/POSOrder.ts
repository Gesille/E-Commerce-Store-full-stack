import mongoose, { Document, Model, Schema } from "mongoose";

export interface ICartItem {
  productId: mongoose.Types.ObjectId;
  name: string;
  price: number;
  qty: number;
  discount: number;
  note?: string;
  barcode?: string;
}

export interface IPaymentLine {
  method: "cash" | "card"| "split";
  amount: number;
}

export type OrderStatus = "draft" | "paid" | "refunded" | "cancelled";

export interface IPOSOrder extends Document {
  sessionId: mongoose.Types.ObjectId;

  shiftId: mongoose.Types.ObjectId;

  cashierId: mongoose.Types.ObjectId;

  openedBy: mongoose.Types.ObjectId;

  odooOrderId?: number;

  customerId?: mongoose.Types.ObjectId;
  customerName?: string;

  cart: ICartItem[];
  paymentLines: IPaymentLine[];

  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  amountPaid: number;
  change: number;

  note: string;
  status: OrderStatus;
  receiptNumber: string;

  createdAt: Date;
  updatedAt: Date;
}

const cartItemSchema = new Schema<ICartItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    qty: { type: Number, required: true, min: 1 },
    discount: { type: Number, default: 0, min: 0, max: 100 },
    barcode: { type: String },
    note: { type: String, default: "" },
  },
  { _id: false },
);

const paymentLineSchema = new Schema<IPaymentLine>(
  {
    method: {
      type: String,
      enum: ["cash", "card", "split"],
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const posOrderSchema = new Schema<IPOSOrder>(
  {
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
  },
  { timestamps: true },
);

posOrderSchema.index({ sessionId: 1, createdAt: -1 });

posOrderSchema.index({ cashierId: 1, createdAt: -1 });

posOrderSchema.index({ shiftId: 1, status: 1 });

const POSOrder: Model<IPOSOrder> =
  mongoose.models.POSOrder ||
  mongoose.model<IPOSOrder>("POSOrder", posOrderSchema);

export default POSOrder;
