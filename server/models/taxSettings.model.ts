import mongoose, { Schema, Document } from "mongoose";



export interface ITaxSettings extends Document {
  type: "holiday";
  label: string;        
  startDate: Date;
  endDate: Date;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TaxSettingsSchema = new Schema<ITaxSettings>(
  {
    type: {
      type: String,
      enum: ["holiday"],
      required: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);


TaxSettingsSchema.index({ type: 1, startDate: 1, endDate: 1, active: 1 });

export default mongoose.model<ITaxSettings>("TaxSettings", TaxSettingsSchema);