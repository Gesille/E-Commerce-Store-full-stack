import mongoose, { Schema } from "mongoose";
const shiftStateTransitionSchema = new Schema({
    toState: {
        type: String,
        enum: ["active", "paused", "closed"],
        required: true,
    },
    at: { type: Date, required: true },
    reason: { type: String },
}, { _id: false });
const cashierShiftLogSchema = new Schema({
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
        enum: ["active", "paused", "closed"],
        default: "active",
    },
    stateHistory: {
        type: [shiftStateTransitionSchema],
        default: [],
    },
    totalOrders: { type: Number, default: 0 },
    totalSales: { type: Number, default: 0 },
}, { timestamps: true });
cashierShiftLogSchema.index({ odooSessionId: 1, cashierId: 1 });
cashierShiftLogSchema.index({ cashierId: 1, state: 1 });
cashierShiftLogSchema.index({ odooSessionId: 1, state: 1 });
const CashierShiftLog = mongoose.models.CashierShiftLog ||
    mongoose.model("CashierShiftLog", cashierShiftLogSchema);
export default CashierShiftLog;
