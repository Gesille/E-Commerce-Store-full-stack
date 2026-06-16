import mongoose, { Schema } from "mongoose";
const AddressSchema = new mongoose.Schema({
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
            validator: (value) => /^\d{10}$/.test(value),
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
            validator: (value) => /^\d{6}$/.test(value),
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
const Address = mongoose.model("Address", AddressSchema);
export default Address;
