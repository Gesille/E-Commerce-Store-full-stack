import { Request, Response, NextFunction } from "express";
import User from "../models/user.model.js";
import Address from "../models/Address.model.js";
import ErrorHandler from "../utils/ErrorHandler.js";
import { CatchAsyncError } from "../middleware/catchAsyncError.js";



export const createAddress = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?._id;

    if (!userId) {
      return next(new ErrorHandler("User not authenticated", 401));
    }

    const userExists = await User.findById(userId);
    if (!userExists) {
      return next(new ErrorHandler("User not found", 404));
    }

    const {
      name,
      contact,
      area,
      city,
      state,
      landmark,
      pincode,
      type = "home",
    } = req.body;

    if (
      !name ||
      !contact ||
      !area ||
      !city ||
      !state ||
      !landmark ||
      !pincode
    ) {
      return next(new ErrorHandler("All fields are required", 400));
    }

    const address = await Address.create({
      user: userId,
      name,
      contact,
      area,
      city,
      state,
      landmark,
      pincode,
      type,
    });

    return res.status(201).json({
      success: true,
      message: "Address created successfully",
      address,
    });
  }
);
// get Address

export const getAddress = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return next(new ErrorHandler("User not authenticated", 401));
    }

    const addresses = await Address.find({ user: userId }).lean();

    res.status(200).json({
      success: true,
      count: addresses.length,
      data: addresses,
    });
  } catch (error: any) {
    return next(new ErrorHandler(error.message, 500));
  }
};

// update address
export const updateAddress = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?._id;
    const { addressId } = req.params;

    if (!userId) {
      return next(new ErrorHandler("User not authenticated", 401));
    }

    const address = await Address.findOne({
      _id: addressId,
      user: userId,
    });

    if (!address) {
      return next(new ErrorHandler("Address not found", 404));
    }

    const updatedAddress = await Address.findByIdAndUpdate(
      addressId,
      {
        $set: req.body, // 🔥 clean update
      },
      { new: true },
    );

    res.json({
      success: true,
      message: "Address updated successfully",
      data: updatedAddress,
    });
  } catch (err: any) {
    next(new ErrorHandler(err.message, 500));
  }
};

// delete address
export const deleteAddress = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?._id;
    const { addressId } = req.params;

    if (!userId) {
      return next(new ErrorHandler("User not authenticated", 401));
    }

    const address = await Address.findOneAndDelete({
      _id: addressId,
      user: userId,
    });

    if (!address) {
      return next(new ErrorHandler("Address not found", 404));
    }

    res.json({
      success: true,
      message: "Address deleted successfully",
    });
  } catch (err: any) {
    next(new ErrorHandler(err.message, 500));
  }
};
