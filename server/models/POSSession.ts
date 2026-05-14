import mongoose, { Document, Model, Schema } from "mongoose";

export type SessionStatus = "open" | "closed";
export type SessionType = "daily" | "long_term";

export interface ICashierSwitch {
  cashierId: mongoose.Types.ObjectId;
  switchedAt: Date;
  switchedBy: mongoose.Types.ObjectId; 
}

export interface IPOSSession extends Document {
  openedBy: mongoose.Types.ObjectId;   
  cashierId: mongoose.Types.ObjectId; 
  status: SessionStatus;
  type: SessionType;
  name: string;                       
  openedAt: Date;
  closedAt?: Date;
  closingNote?: string;
  cashierHistory: ICashierSwitch[]; 
  openingBalance: number;
  closingBalance?: number;
}

const cashierSwitchSchema = new Schema<ICashierSwitch>(
  {
    cashierId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    switchedAt: { type: Date, default: Date.now },
    switchedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { _id: false }
);

const posSessionSchema = new Schema<IPOSSession>(
  {
    openedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    cashierId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["open", "closed"],
      default: "open",
    },
    type: {
      type: String,
      enum: ["daily", "long_term"],
      default: "daily",
    },
    name: { type: String, required: true },
    openedAt: { type: Date, default: Date.now },
    closedAt: { type: Date },
    closingNote: { type: String },
    cashierHistory: { type: [cashierSwitchSchema], default: [] },
    openingBalance: { type: Number, default: 0 },
    closingBalance: { type: Number },
  },
  { timestamps: true }
);

posSessionSchema.index({ status: 1 });

const POSSession: Model<IPOSSession> =
  mongoose.models.POSSession ||
  mongoose.model<IPOSSession>("POSSession", posSessionSchema);

export default POSSession;