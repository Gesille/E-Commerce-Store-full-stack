import mongoose, { Schema } from "mongoose";
const cashierSwitchSchema = new Schema({
    cashierId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    switchedAt: { type: Date, default: Date.now },
    switchedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
}, { _id: false });
const posSessionSchema = new Schema({
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
}, { timestamps: true });
posSessionSchema.index({ status: 1 });
const POSSession = mongoose.models.POSSession ||
    mongoose.model("POSSession", posSessionSchema);
export default POSSession;
