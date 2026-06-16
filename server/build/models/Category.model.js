import mongoose, { Schema } from "mongoose";
// Define the schema for the Category model
const CategorySchema = new Schema({
    catTitle: {
        type: String,
        required: true,
    },
    catDesc: {
        type: String,
        required: true,
    },
    odooCategoryId: {
        type: Number,
    }
}, { timestamps: true });
// Export the Category model with types
const Category = mongoose.models.Category || mongoose.model("Category", CategorySchema);
export default Category;
