// controllers/contact.controller.ts
import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncError.js";
import ErrorHandler from "../utils/ErrorHandler.js";
import sendMail from "../utils/sendMail.js";
import MessageModel from "../models/message.model.js";

// anyone can send a message
export const sendContactMessage = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { name, email, phone, message } = req.body;

    if (!name || !email || !message) {
      return next(new ErrorHandler("Name, email and message are required", 400));
    }

    // 1️⃣ save to DB
    await MessageModel.create({ name, email, phone, message });

    // 2️⃣ notify manager
    try {
      await sendMail({
        email: process.env.MANAGER_EMAIL!,
        subject: `New Contact Message from ${name}`,
        template: "contact-notification.ejs",
        data: { name, email, phone, message },
      });
    } catch (err) {
      console.log("manager email failed:", err);
    }

    // 3️⃣ confirm to user
    try {
      await sendMail({
        email,
        subject: "We received your message - Chef's World",
        template: "contact-confirmation.ejs",
        data: { name },
      });
    } catch (err) {
      console.log("user email failed:", err);
    }

    res.status(200).json({ success: true, message: "Message sent successfully" });
  }
);

// admin only
export const getAllMessages = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const messages = await MessageModel.find().sort({ createdAt: -1 });
    const unreadCount = await MessageModel.countDocuments({ isRead: false });
    res.status(200).json({ success: true, messages, unreadCount });
  }
);

export const markAsRead = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const message = await MessageModel.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );
    if (!message) return next(new ErrorHandler("Message not found", 404));
    res.status(200).json({ success: true, message });
  }
);

export const deleteMessage = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    await MessageModel.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "Deleted successfully" });
  }
);