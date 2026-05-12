import nodemailer, { TransportOptions } from "nodemailer";
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

// utils/sendMail.ts
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: true,
  family: 4, // ✅ force IPv4 — fixes Railway IPv6 issue
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
}as TransportOptions);
console.log("smtp user",process.env.GMAIL_USER)
console.log("smtp PASS",process.env.GMAIL_APP_PASSWORD)
const sendMail = async (options: EmailOptions): Promise<void> => {
  const { email, subject, template, data } = options;

  const templatePath = path.join(__dirname, "../mails", template);
  const html = await ejs.renderFile(templatePath, data);
transporter.verify((error,success) =>{
  if(error){
    console.log(error)
  }else{
    console.log("SMTP READY")
  }
})

  await transporter.sendMail({
    from: `"Next International" <${process.env.GMAIL_USER}>`,
    to: email,
    subject,
    html,
  });

  console.log("✅ Email sent to:", email);
};

export default sendMail;