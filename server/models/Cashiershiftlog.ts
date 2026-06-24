import mongoose, { Document, Model, Schema } from "mongoose";

export type ShiftState = "active" | "paused" | "closed";

export interface IShiftStateTransition {
  toState: ShiftState;

  at: Date;

  reason?: string;
}

export interface ICashierShiftLog extends Document {
  odooSessionId: number;

  cashierId: mongoose.Types.ObjectId;

  odooPartnerId: number;

  startTime: Date;
  endTime?: Date;

  state: ShiftState;

  stateHistory: IShiftStateTransition[];

  totalOrders: number;
  totalSales: number;

  createdAt: Date;
  updatedAt: Date;
   cashCount?: {
    denominations: { value: number; label: string; count: number }[];
    countedTotal: number;
    submittedAt: Date;
    submittedBy: string;
    role: "cashier" | "manager";
    notes: string;
  };
}

const shiftStateTransitionSchema = new Schema<IShiftStateTransition>(
  {
    toState: {
      type: String,
      enum: ["active", "paused", "closed"] as ShiftState[],
      required: true,
    },
    at: { type: Date, required: true },
    reason: { type: String },
  },
  { _id: false },
);

const cashierShiftLogSchema = new Schema<ICashierShiftLog>(
  {
    odooSessionId: { type: Number, required: true },

    cashierId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    odooPartnerId: { type: Number, required: true },

    startTime: { type: Date, default: Date.now },
    endTime: { type: Date },

    state: {
      type: String,
      enum: ["active", "paused", "closed"] as ShiftState[],
      default: "active",
    },
    stateHistory: {
      type: [shiftStateTransitionSchema],
      default: [],
    },

    totalOrders: { type: Number, default: 0 },
    totalSales: { type: Number, default: 0 },
    cashCount: {
  denominations: [
    {
      value: { type: Number },
      label: { type: String },
      count: { type: Number },
    },
  ],
  countedTotal: { type: Number },
  submittedAt: { type: Date },
  submittedBy: { type: String },
  role: { type: String, enum: ["cashier", "manager"] },
  notes: { type: String },
},
  },
  { timestamps: true },
);

cashierShiftLogSchema.index({ odooSessionId: 1, cashierId: 1 });

cashierShiftLogSchema.index({ cashierId: 1, state: 1 });

cashierShiftLogSchema.index({ odooSessionId: 1, state: 1 });

const CashierShiftLog: Model<ICashierShiftLog> =
  mongoose.models.CashierShiftLog ||
  mongoose.model<ICashierShiftLog>("CashierShiftLog", cashierShiftLogSchema);

export default CashierShiftLog;
