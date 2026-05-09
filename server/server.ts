import { app } from "./app.js";
import { initSocketServer } from "./socketServer.js";
import connectDB from "./utils/db.js";
import { v2 as cloudinary } from "cloudinary";
import http from "http";
import dotenv from "dotenv";
import { startOrderExpiryJob } from "./cron/orderExpiry.job.js";

dotenv.config();
console.log(process.env.ACCESS_TOKEN); 
console.log(process.env.REFRESH_TOKEN);
const server = http.createServer(app);


cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_SECRET_KEY,
});


initSocketServer(server);
startOrderExpiryJob();

server.listen(process.env.PORT, () => {
    console.log(`Server is connected with port ${process.env.PORT}`);
    connectDB();
});
