import { Request, Response } from "express";

import mongoose from "mongoose";
import Category from "../models/Category.model.js";
import { odooRequest } from "../odoo/odoo.client.js";

// create category
export const createCategory = async (req: Request, res: Response) => {
  const { catTitle, catDesc } = req.body;

  if (!catTitle?.trim() || !catDesc?.trim()) {
    return res.status(400).json({
      message: "Title and description are required",
    });
  }

  try {
    // 1. CREATE IN ODOO FIRST
    const odooCategoryId = await odooRequest("product.category", "create", [
      {
        name: catTitle,
      },
    ]);

    if (!odooCategoryId) {
      return res.status(500).json({
        message: "Failed to create category in Odoo",
      });
    }

    // 2. SAVE IN MONGODB WITH ODOO ID
    const newCategory = new Category({
      catTitle,
      catDesc,
      odooCategoryId, 
    });

    await newCategory.save();

    return res.status(201).json({
      message: "Category created successfully",
      category: newCategory,
      odooCategoryId,
    });

  } catch (error: any) {
    return res.status(500).json({
      message: "Error creating category",
      error: error.message || error,
    });
  }
};
// get all categories
export const getCategories = async (req: Request, res: Response) => {
  try {
    const mongoCategories = await Category.find();

    const odooCategories = await odooRequest(
      "product.category",
      "search_read",
      [[]],
      {
        fields: ["id", "name"],
      }
    );

    // convert Odoo to same format
    const formattedOdoo = odooCategories.map((cat: any) => ({
      catTitle: cat.name,
      odooCategoryId: cat.id,
      source: "odoo",
    }));

    //  remove duplicates (based on odooCategoryId)
    const merged = [
      ...mongoCategories.map((c) => ({
        catTitle: c.catTitle,
        catDesc: c.catDesc,
        odooCategoryId: c.odooCategoryId,
        source: "mongodb",
      })),
      ...formattedOdoo,
    ];

    //  deduplicate
    const unique = Array.from(
      new Map(merged.map((item) => [item.odooCategoryId, item])).values()
    );

    return res.status(200).json({
      count: unique.length,
      categories: unique,
    });

  } catch (error: any) {
    return res.status(500).json({
      message: "Error fetching categories",
      error: error.message || error,
    });
  }
};

// update category
export const updateCategory = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { catTitle, catDesc } = req.body;

  const category = await Category.findById(id);

  if (!category) {
    return res.status(404).json({ message: "Category not found" });
  }

  category.catTitle = catTitle || category.catTitle;
  category.catDesc = catDesc || category.catDesc;

  await category.save();

  //  Sync to Odoo
  if (category.odooCategoryId) {
    await odooRequest("product.category", "write", [
      [category.odooCategoryId],
      { name: category.catTitle },
    ]);
  }

  return res.status(200).json({
    message: "Category updated successfully",
    category,
  });
};

// delete category
export const deleteCategory = async (req: Request, res: Response) => {
  const { id } = req.params;

  const category = await Category.findById(id);

  if (!category) {
    return res.status(404).json({ message: "Category not found" });
  }

  //  delete from Odoo first
  if (category.odooCategoryId) {
    await odooRequest("product.category", "unlink", [
      [category.odooCategoryId],
    ]);
  }

  await Category.deleteOne({ _id: id });

  return res.status(200).json({
    message: "Category deleted successfully",
  });
};



// get categories by id
export const getCategoryById = async (req: Request, res: Response) => {
  const { id } = req.params;

  // التحقق من صحة معرف التصنيف
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid category ID" });
  }

  try {
    // البحث عن التصنيف بواسطة المعرف
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    return res.status(200).json(category);
  } catch (error: any) {
    return res.status(500).json({
      message: "Error fetching category",
      error: error.message || error,
    });
  }
};
