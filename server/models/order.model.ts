import mongoose, { Schema, Document } from "mongoose";

export interface IOrder extends Document {
  userId: mongoose.Types.ObjectId;

  address: mongoose.Types.ObjectId;
  // In OrderSchema, add this field:

  // Also add to IOrder interface:
  shippingAddress?: {
    name?: string;
    email?: string;
    phone?: string;
    city?: string;
    address?: string;
  };
  items: {
    productId: number;
    name: string; // Odoo product.product (variant)
    quantity: number;
    price: number;

    variantInfo: {
      color?: string;
      size?: string;
    };
    createdAt?: Date;
  }[];

  total: number;
  odooPartnerId: number;
  status:
    | "done"
    | "pending"
    | "confirmed"
    | "cancelled"
    | "delivering"
    | "processing";
  paymentStatus: "unpaid" | "paid";
  expiresAt: Date;
  odooSaleOrderId: number;
}

const OrderSchema = new Schema<IOrder>(
  {
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
  },
  { timestamps: true },
);

export default mongoose.model<IOrder>("Order", OrderSchema);
