import mongoose, { Document, Schema } from "mongoose";


export interface IAddress extends Document {
  user: mongoose.Types.ObjectId;
  name: string;
  contact: string;
  area: string;
  city: string;
  state: string;
  landmark: string;
  pincode: string;
  type: "home" | "work" | "other";
}

const AddressSchema: Schema = new mongoose.Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User", 
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  contact: {
    type: String,
    required: true,
    validate: {
      validator: (value: string) => /^\d{10}$/.test(value), 
      message: "Contact number must be exactly 10 digits.",
    },
  },
  area: {
    type: String,
    required: true,
  },
  city: {
    type: String,
    required: true,
  },
  state: {
    type: String,
    required: true,
  },
  landmark: {
    type: String,
    required: true,
  },
  pincode: {
    type: String,
    required: true,
    validate: {
      validator: (value: string) => /^\d{6}$/.test(value),
      message: "Pincode must be exactly 6 digits.",
    },
  },
  type: {
    type: String,
    required: true,
    enum: ["home", "work", "other"],
    default: "home",
  },
});


const Address = mongoose.model<IAddress>("Address", AddressSchema);
export default Address;
