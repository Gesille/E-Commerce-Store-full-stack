import dotenv from "dotenv";
dotenv.config();

const ODOO_URL  = process.env.ODOO_URL as string;
const ODOO_DB   = process.env.ODOO_DB as string;
const ODOO_USER = process.env.ODOO_USERNAME as string; 
const ODOO_KEY  = process.env.ODOO_API_KEY as string; 


let sessionCookie: string | null = null;

async function getSession(): Promise<string> {
  if (sessionCookie) return sessionCookie;

  const res = await fetch(`${ODOO_URL}/web/session/authenticate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "call",
      params: { db: ODOO_DB, login: ODOO_USER, password: ODOO_KEY },
    }),
  });

  // استخرج الـ session_id من الـ cookie
  const cookie = res.headers.get("set-cookie") || "";
  const match  = cookie.match(/session_id=([^;]+)/);
  if (!match) throw new Error("فشل تسجيل الدخول لـ Odoo — تحقق من ODOO_USER و ODOO_KEY");

  sessionCookie = match[1];
  return sessionCookie;
}

export const odooRequest = async <T = any>(
  model: string,
  method: string,
  args: any[] = [],
  kwargs: any = {}
): Promise<T> => {
  const session = await getSession();

  const res = await fetch(`${ODOO_URL}/web/dataset/call_kw`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `session_id=${session}`,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "call",
      id: Date.now(),
      params: {
        model,
        method,
        args,
        kwargs: { context: {}, ...kwargs },
      },
    }),
  });

  const data: { result?: T; error?: any } = await res.json();

  if (data.error) {
    if (data.error.code === 100) {
      sessionCookie = null;
      return odooRequest<T>(model, method, args, kwargs);
    }
    throw new Error(data.error?.data?.message || "Odoo request failed");
  }

  return data.result as T;
};