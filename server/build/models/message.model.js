// models/message.model.ts
import mongoose, { Schema } from "mongoose";
const messageSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
}, { timestamps: true });
const MessageModel = mongoose.model("Message", messageSchema);
export default MessageModel;
