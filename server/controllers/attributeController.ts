import { Request, Response } from "express";
import { getOdooAttributeValueNames } from "../utils/odooAttributes.js";

type AttributeType = "colors" | "sizes" | "materials";

const ATTRIBUTE_NAME_MAP: Record<AttributeType, string> = {
  colors: "Color",
  sizes: "Size",
  materials: "Material",
};

export const getAttributeOptions = async (req: Request, res: Response) => {
  try {
    const rawType = req.params.type;
    const type = (Array.isArray(rawType) ? rawType[0] : rawType) as AttributeType;

    const attributeName = ATTRIBUTE_NAME_MAP[type];

    if (!attributeName) {
      return res.status(400).json({ message: "Invalid attribute type" });
    }

    const values = await getOdooAttributeValueNames(attributeName);
    res.json({ success: true, values });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};