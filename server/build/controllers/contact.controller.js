import { CatchAsyncError } from "../middleware/catchAsyncError.js";
import ErrorHandler from "../utils/ErrorHandler.js";
import sendMail from "../utils/sendMail.js";
import MessageModel from "../models/message.model.js";
import userModel from "../models/user.model.js";
// anyone can send a message
export const sendContactMessage = CatchAsyncError(async (req, res, next) => {
    const { name, email, phone, message } = req.body;
    if (!name || !email || !message) {
        return next(new ErrorHandler("Name, email and message are required", 400));
    }
    // 1️⃣ save to DB
    await MessageModel.create({ name, email, phone, message });
    // 2️⃣ find ALL admins
    const adminUsers = await userModel.find({ role: "admin" });
    console.log("✅ Admins found:", adminUsers.length, adminUsers.map(a => a.email));
    if (!adminUsers.length)
        return next(new ErrorHandler("No admin found", 404));
    // 3️⃣ send to all admins in parallel
    await Promise.all(adminUsers.map(async (adminUser) => {
        try {
            await sendMail({
                email: adminUser.email,
                subject: `New Contact Message from ${name}`,
                template: "contact-notification.ejs",
                data: { name, email, phone, message },
            });
            console.log("✅ Admin email sent to:", adminUser.email);
        }
        catch (err) {
            console.log("❌ Admin email failed for:", adminUser.email, err);
        }
    }));
    // 4️⃣ confirm to user
    try {
        await sendMail({
            email,
            subject: "We received your message - Chef's World",
            template: "contact-confirmation.ejs",
            data: { name },
        });
        console.log("✅ User confirmation sent to:", email);
    }
    catch (err) {
        console.log("❌ User email failed:", err);
    }
    res.status(200).json({ success: true, message: "Message sent successfully" });
});
// admin only
export const getAllMessages = CatchAsyncError(async (req, res, next) => {
    const messages = await MessageModel.find().sort({ createdAt: -1 });
    const unreadCount = await MessageModel.countDocuments({ isRead: false });
    res.status(200).json({ success: true, messages, unreadCount });
});
export const markAsRead = CatchAsyncError(async (req, res, next) => {
    const message = await MessageModel.findByIdAndUpdate(req.params.id, { isRead: true }, { new: true });
    if (!message)
        return next(new ErrorHandler("Message not found", 404));
    res.status(200).json({ success: true, message });
});
export const deleteMessage = CatchAsyncError(async (req, res, next) => {
    await MessageModel.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "Deleted successfully" });
});
