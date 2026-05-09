import sgMail from "@sendgrid/mail";
import ejs from "ejs";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

dotenv.config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY as string);

interface EmailOptions {
  email: string;
  subject: string;
  template: string;
  data: { [key: string]: any };
}

// ✔ الحل الصحيح لـ ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sendMail = async (options: EmailOptions): Promise<void> => {
  const { email, subject, template, data } = options;

  const templatePath = path.join(__dirname, "../mails", template);

  const html = await ejs.renderFile(templatePath, data);

  const msg = {
    to: email,
    from: process.env.SENDGRID_EMAIL as string,
    subject,
    html,
  };

  await sgMail.send(msg);
};

export default sendMail;