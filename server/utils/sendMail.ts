import nodemailer from "nodemailer";
import ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface EmailOptions {
  email: string;
  subject: string;
  template: string;
  data: { [key: string]: any };
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const sendMail = async (options: EmailOptions): Promise<void> => {
  const { email, subject, template, data } = options;

  const templatePath = path.join(__dirname, "../mails", template);
  const html = await ejs.renderFile(templatePath, data);

  console.log("📨 Gmail Config:", {
    to: email,
    from: process.env.GMAIL_USER,
    user: process.env.GMAIL_USER ? "SET" : "MISSING",
    pass: process.env.GMAIL_APP_PASSWORD ? "SET" : "MISSING",
  });
  console.log("📧 Gmail User:", process.env.GMAIL_USER);
console.log("🔑 Gmail Pass:", process.env.GMAIL_APP_PASSWORD ? "SET" : "MISSING");

  await transporter.sendMail({
    from: `"Next International" <${process.env.GMAIL_USER}>`,
    to: email,
    subject,
    html,
  });

  console.log("✅ Email sent to:", email);
};

export default sendMail;