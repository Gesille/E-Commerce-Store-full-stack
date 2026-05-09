import cron from "node-cron";
import Order from "../models/order.model.js";
import userModel from "../models/user.model.js";

export const startOrderExpiryJob = () => {
  cron.schedule("*/10 * * * *", async () => {
    try {
      const expired = await Order.find({
        status: "pending",
        expiresAt: { $lte: new Date() },
      });

      for (const order of expired) {
        // ✅ Remove from user's orders array
        await userModel.findByIdAndUpdate(order.userId, {
          $pull: { orders: order._id },
        });

        // ✅ Just delete — order never reached Odoo
        await Order.findByIdAndDelete(order._id);

        console.log(`Deleted expired order: ${order._id}`);
      }

      if (expired.length > 0) {
        console.log(`Cleaned up ${expired.length} expired orders`);
      }
    } catch (err: any) {
      console.error("Cron job error:", err.message);
    }
  });
};