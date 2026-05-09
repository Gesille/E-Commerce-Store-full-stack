// models/message.model.ts
import mongoose, { Document, Model, Schema } from "mongoose";

export interface IMessage extends Document {
  name: string;
  email: string;
  phone?: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const MessageModel: Model<IMessage> = mongoose.model("Message", messageSchema);
export default MessageModel;