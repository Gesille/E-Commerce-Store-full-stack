import { Request, Response, NextFunction } from "express";

import { CatchAsyncError } from "../middleware/catchAsyncError.js";
import jwt, { JwtPayload, Secret } from "jsonwebtoken";
import ejs from "ejs";
import path from "path";
import sendMail from "../utils/sendMail.js";
import cloudinary from "cloudinary";
import {
 
  accessTokenOptions,
  refreshTokenOptions,
  sendToken,
} from "../utils/jwt.js";
// import { redis } from "../utils/redis";
import {
  getAllUsersService,
  getUserById,
  updateUserRoleService,
} from "../services/user.service.js";
import ErrorHandler from "../utils/ErrorHandler.js";
import dotenv from "dotenv";
import userModel, { IUser } from "../models/user.model.js";
import { odooRequest } from "../odoo/odoo.client.js";
import mongoose from "mongoose";
import orderModel from "../models/order.model.js";

dotenv.config();

//register user
interface IRegistrationBody {
  name: string;
  email: string;
  password: string;
  avatar?: string;
  role: string;
}

export const registrationUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, password, role = "user" } = req.body;
      if (!name || !email || !password) {
        return next(new ErrorHandler("All fields are required", 400));
      }

      const isEmailExist = await userModel.findOne({ email });
      if (isEmailExist) {
        return next(new ErrorHandler("Email is already exist", 400));
      }
      const user: IRegistrationBody = {
        name,
        email,
        password,
        role,
      };
      const activationToken = createActivationToken(user);
      const activationCode = activationToken.activationCode;
      const data = { user: { name: user.name }, activationCode };

      try {
        await sendMail({
          email: user.email,
          subject: "Activate your account.",
          template: "activation-mail.ejs",
          data,
        });
        res.status(201).json({
          success: true,
          message: `Please check your email:${user.email} to activate your account `,
          activationToken: activationToken.token,
        });
      } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  },
);

interface IActivationToken {
  token: string;
  activationCode: string;
}

export const createActivationToken = (user: any): IActivationToken => {
  const activationCode = Math.floor(1000 + Math.random() * 9000).toString();

  const token = jwt.sign(
    {
      user,
      activationCode,
    },
    process.env.ACTIVATION_SECRET as Secret,
    {
      expiresIn: "5m",
    },
  );
  return { token, activationCode };
};

//activate user
interface IActivationRequest {
  activation_token: string;
  activation_code: string;
}
export const activateUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { activation_code, activation_token } =
        req.body as IActivationRequest;

      if (!activation_token || !activation_code) {
        return next(
          new ErrorHandler("Activation token and code are required", 400),
        );
      }

      const newUser: {
        user: IUser;
        activationCode: string;
      } = jwt.verify(
        activation_token,
        process.env.ACTIVATION_SECRET as string,
      ) as { user: IUser; activationCode: string };

      if (newUser.activationCode !== activation_code) {
        return next(new ErrorHandler("Invalid activation code", 400));
      }

      const { name, email, password } = newUser.user;

      const existUser = await userModel.findOne({ email });
      if (existUser) {
        return next(new ErrorHandler("Email is already exist", 400));
      }

      //  create user first
      const user = await userModel.create({
        name,
        email,
        password,
      });

      let partnerId: number;

      try {
        //create partner in Odoo
        partnerId = await odooRequest("res.partner", "create", [
          {
            name: user.name,
            email: user.email,
          },
        ]);
      } catch (err) {
        console.error("❌ Odoo error:", err);

        // 🔥 IMPORTANT: rollback user
        await user.deleteOne();

        return next(new ErrorHandler("Failed to sync with Odoo", 500));
      }

      // save partner id
      user.odooPartnerId = Number(partnerId);
      await user.save();

      res.status(201).json({
        success: true,
        message: "User activated and synced with Odoo",
      });
    } catch (error: any) {
      console.error("Activation Error:", error);
      return next(
        new ErrorHandler(error.message || "Something went wrong", 400),
      );
    }
  },
);

//login user
interface ILoginRequest {
  email: string;
  password: string;
}
export const loginUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body as ILoginRequest;

      if (!email || !password) {
        return next(
          new ErrorHandler("Please enter your email and password ", 400),
        );
      }
      const user = await userModel.findOne({ email }).select("+password");

      if (!user) {
        return next(new ErrorHandler("Invalid email or password", 400));
      }
      const isPasswordMatch = await user.comparePassword(password);

      if (!isPasswordMatch) {
        return next(new ErrorHandler("Invalid email or password", 400));
      }

      sendToken(user, 200, res);
      user.save();
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  },
);

//logout user
export const logoutUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.cookie("access_token", "", { maxAge: 1 });
      res.cookie("refresh_token", "", { maxAge: 1 });
      const userId = req.user?._id || "";
      
      res.status(200).json({
        success: true,
        message: "Logged out is successfully",
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  },
);

//update access token
export const updateAccessToken = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refresh_token = req.cookies.refresh_token as string;

      if (!refresh_token) {
        return next(new ErrorHandler("Please login to access this resource", 401));
      }

      const decoded = jwt.verify(
        refresh_token,
        process.env.REFRESH_TOKEN as string
      ) as JwtPayload;

      const user = await userModel.findById(decoded.id);
      if (!user) return next(new ErrorHandler("User not found", 404));

      const accessToken = jwt.sign(
        { id: user._id },
        process.env.ACCESS_TOKEN as string,
        { expiresIn: "1h" }
      );

      const refreshToken = jwt.sign(
        { id: user._id },
        process.env.REFRESH_TOKEN as string,
        { expiresIn: "3d" }
      );

      // ✅ set both cookies again
      res.cookie("access_token", accessToken, accessTokenOptions);
      res.cookie("refresh_token", refreshToken, refreshTokenOptions);
console.log("🔄 refresh_token:", req.cookies.refresh_token);
console.log("🍪 All cookies:", req.cookies);
      req.user = user; // ✅ set user so next middleware works

      next(); // ✅ IMPORTANT — continue to the actual route handler

    } catch (error: any) {
      return next(new ErrorHandler(error.message, 401));
    }
  }
);
// update user info
export const updateUserInfo = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, phone, address } = req.body;

      const userId = req.user?._id;

      const user = await userModel.findById(userId);

      if (!user) {
        return next(new ErrorHandler("User not found", 404));
      }

      if (name) user.name = name;
      if (phone) user.phone = phone;

      if (address) {
        user.address = {
          street: address.street,
          city: address.city,
          country: address.country,
          zip: address.zip,
        } as any;
      }

      await user.save();

      res.status(200).json({
        success: true,
        user,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);
//get user Info

export const getUserInfo = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?._id;
      getUserById(userId, res);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  },
);

// social auth

interface ISocialAuthBody {
  email: string;
  name: string;
  avatar: string;
}
export const socialAuth = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, name, avatar } = req.body as ISocialAuthBody;
      const user = await userModel.findOne({ email });
      if (!user) {
        const newUser = await userModel.create({ email, name, avatar });
        sendToken(newUser, 200, res);
      } else {
        sendToken(user, 200, res);
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  },
);

//update user password
interface IUpdatePassword {
  oldPassword: string;
  newPassword: string;
}

export const updatePassword = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { oldPassword, newPassword } = req.body as IUpdatePassword;

      if (!oldPassword || !newPassword) {
        return next(
          new ErrorHandler("Please inter your old and new password", 400),
        );
      }

      const user = await userModel.findById(req.user?._id).select("password");
      if (user?.password === undefined) {
        return next(new ErrorHandler("Invalid user", 400));
      }
      if (!user) {
        return next(new ErrorHandler("User not found", 404));
      }
      const isPasswordMatch = await user?.comparePassword(oldPassword);

      if (!isPasswordMatch) {
        return next(new ErrorHandler("Invalid old password", 400));
      }
      user.password = newPassword;
      await user?.save();

      await userModel.findByIdAndUpdate(req.user?._id, user);

      res.status(201).json({
        success: true,
        user,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  },
);

//update profile picture

export const updateProfilePicture = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { avatar } = req.body;
      const userId = req?.user?._id;
      const user = await userModel.findById(userId);

      if (avatar && user) {
        //if user have an avatar then call this
        if (user?.avatar?.public_id) {
          //first delete the old image
          await cloudinary.v2.uploader.destroy(user?.avatar?.public_id);
          const myCloud = await cloudinary.v2.uploader.upload(avatar, {
            folder: "avatars",
            width: 150,
          });
          user.avatar = {
            public_id: myCloud.public_id,
            url: myCloud.secure_url,
          };
        } else {
          const myCloud = await cloudinary.v2.uploader.upload(avatar, {
            folder: "avatars",
            width: 150,
          });
          user.avatar = {
            public_id: myCloud.public_id,
            url: myCloud.secure_url,
          };
        }
      }

      await user?.save();

      await userModel.findByIdAndUpdate(userId, { user });

      res.status(201).json({
        success: true,
        user,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);


//get all users === only for admin
export const getAllUsers = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userRole = req.user?.role;

      if (userRole !== "admin") {
        return next(
          new ErrorHandler("You are not authorized to view all users", 403),
        );
      }
      getAllUsersService(res);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  },
);

// update user role === only for admin
export const updateUserRole = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userRole = req.user?.role;

      if (userRole !== "admin") {
        return next(
          new ErrorHandler("You are not authorized to update user roles", 403),
        );
      }

      const { id, role } = req.body;

      const isUserExist = await userModel.findById(id);

      if (!isUserExist) {
        return res.status(400).json({
          success: false,
          message: "User Not Found",
        });
      }

      await updateUserRoleService(res, id.toString(), role);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  },
);

//Delete user === only admin
export const deleteUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userRole = req.user?.role;

      if (userRole !== "admin") {
        return next(
          new ErrorHandler("You are not authorized to delete users", 403),
        );
      }
      const { id } = req.params;
      const user = await userModel.findById(id);
      if (!user) {
        return next(new ErrorHandler("User not founf", 404));
      }
      await user.deleteOne({ id });
      res.status(201).json({
        success: true,
        message: "User deleted successfully",
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  },
);

export const checkUserRole = (role: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user?.role;
    if (userRole !== role) {
      return next(new ErrorHandler("You are not authorized", 403));
    }
    next();
  };
};


export const getTopSpenders = async (req:Request, res:Response) => {
  const users = await userModel.aggregate([
    {
      $lookup: {
        from: "orders",
        localField: "_id",
        foreignField: "userId",
        as: "orders",
      },
    },
    {
      $addFields: {
        totalSpent: {
          $sum: "$orders.totalPrice",
        },
      },
    },
    { $sort: { totalSpent: -1 } },
    { $limit: 5 },
  ]);

  res.json(users);
};



export const getMostActiveUsers = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await userModel.aggregate([
        {
          $lookup: {
            from: "orders",
            localField: "_id",
            foreignField: "userId",
            as: "orders",
          },
        },
        {
          $addFields: {
            ordersCount: { $size: "$orders" },
          },
        },
        { $sort: { ordersCount: -1 } },
        { $limit: 5 },
        {
          $project: {
            name: 1,
            email: 1,
            avatar: 1,
            ordersCount: 1,
            createdAt: 1,
          },
        },
      ]);

      res.status(200).json({ success: true, users });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);


export const getRecentUsers = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await userModel
        .find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select("name email avatar createdAt"); // only what you need

      res.status(200).json({ success: true, users });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);




// user.controller.ts
export const getRegistrationsPerMonth = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await userModel.find({}, { createdAt: 1 });

      // Use "YYYY-MM" as key for reliable sorting
      const monthMap: Record<string, { label: string; count: number }> = {};

      for (const user of users) {
        const date = new Date(user.createdAt);
        const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`; // "2025-01"
        const label = date.toLocaleString("default", { month: "long", year: "numeric" }); // "January 2025"

        if (!monthMap[yearMonth]) {
          monthMap[yearMonth] = { label, count: 0 };
        }
        monthMap[yearMonth].count += 1;
      }

      const sorted = Object.entries(monthMap)
        .sort(([a], [b]) => a.localeCompare(b)) // "2025-01" sorts correctly as string
        .slice(-6)
        .map(([_, val]) => ({ month: val.label, count: val.count }));

      res.status(200).json({ success: true, data: sorted });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);



export const getUserActivity = async (req:Request, res:Response) => {
  try {
    const { id } = req.params;

    const data = await orderModel.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(id),
        },
      },
      {
        $group: {
          _id: {
            month: { $month: "$createdAt" },
            year: { $year: "$createdAt" },
          },
          orders: { $sum: 1 },
          spent: { $sum: "$totalPrice" },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 },
      },
    ]);

    const formatted = data.map((d) => ({
      month: `${d._id.year}-${d._id.month}`,
      orders: d.orders,
      spent: d.spent,
    }));

    res.json({ data: formatted });
  } catch (err:any) {
    res.status(500).json({ message: err.message });
  }
};



export const managerRegisterUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { name, email, password, phone, address, role = "user" } = req.body;

    if (!name || !email || !password)
      return next(new ErrorHandler("Name, email and password are required", 400));

    const isEmailExist = await userModel.findOne({ email });
    if (isEmailExist)
      return next(new ErrorHandler("Email already exists", 400));

    // 1. Create user directly (no activation token needed)
    const user = await userModel.create({
      name,
      email,
      password,
      role,
      ...(phone && { phone }),
      ...(address && { address }),
    });

    // 2. Sync with Odoo
    let partnerId: number;
    try {
      partnerId = await odooRequest("res.partner", "create", [
        {
          name: user.name,
          email: user.email,
          ...(phone && { phone }),
        },
      ]);
    } catch (err) {
      // Rollback user if Odoo fails
      await user.deleteOne();
      return next(new ErrorHandler("Failed to sync with Odoo", 500));
    }

    user.odooPartnerId = Number(partnerId);
    await user.save();

    // 3. Notify the new user by email
    await sendMail({
      email: user.email,
      subject: "Your account has been created",
      template: "manager-created-user.ejs",
      data: {
        name: user.name,
        email: user.email,
        password, // plain text — only sent once, user should change it
      },
    });

    res.status(201).json({
      success: true,
      message: `User ${user.name} created and synced with Odoo successfully`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        odooPartnerId: user.odooPartnerId,
      },
    });
  }
);