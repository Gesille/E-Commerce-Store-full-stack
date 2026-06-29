import { odooRequest } from "../odoo/odoo.client.js";
import TaxSettings from "../models/taxSettings.model.js";

// ─── Cache (in-memory, resets on server restart) ──────────────────────────────
let _abctTaxId: number | null = null;
let _taxExemptFiscalPositionId: number | null = null;
let _taxHolidayFiscalPositionId: number | null = null;

// ─── ABCT Tax ID ──────────────────────────────────────────────────────────────

export const getABCTTaxId = async (): Promise<number | null> => {
  if (_abctTaxId) return _abctTaxId;

  const taxes = await odooRequest(
    "account.tax",
    "search_read",
    [[["name", "=", "ABCT"], ["type_tax_use", "=", "sale"]]],
    { fields: ["id", "name", "amount"], limit: 1 },
  );

  if (!taxes.length) {
    console.warn("[TAX] ABCT tax not found in Odoo. Products will have no sales tax.");
    return null;
  }

  _abctTaxId = taxes[0].id;
  console.log(`[TAX] ABCT tax found: id=${_abctTaxId}, amount=${taxes[0].amount}%`);
  return _abctTaxId;
};

// ─── Fiscal Position IDs ──────────────────────────────────────────────────────

export const getTaxExemptFiscalPositionId = async (): Promise<number | null> => {
  if (_taxExemptFiscalPositionId) return _taxExemptFiscalPositionId;

  const fps = await odooRequest(
    "account.fiscal.position",
    "search_read",
    [[["name", "=", "Tax Exempt"]]],
    { fields: ["id", "name"], limit: 1 },
  );

  if (!fps.length) {
    console.warn('[TAX] "Tax Exempt" fiscal position not found in Odoo.');
    return null;
  }

  _taxExemptFiscalPositionId = fps[0].id;
  return _taxExemptFiscalPositionId;
};


export const getTaxHolidayFiscalPositionId = async (): Promise<number | null> => {
  if (_taxHolidayFiscalPositionId) return _taxHolidayFiscalPositionId;

  const fps = await odooRequest(
    "account.fiscal.position",
    "search_read",
    [[["name", "=", "Tax Holiday"]]],
    { fields: ["id", "name"], limit: 1 },
  );

  if (!fps.length) {
    console.warn('[TAX] "Tax Holiday" fiscal position not found in Odoo.');
    return null;
  }

  _taxHolidayFiscalPositionId = fps[0].id;
  return _taxHolidayFiscalPositionId;
};

// ─── Order-Level Tax Resolution ───────────────────────────────────────────────

export const resolveFiscalPosition = async (
  customerId?: number,
): Promise<number | false> => {
  // ── 1. Check customer exemption ───────────────────────────────────────────
  if (customerId) {
    const partners = await odooRequest(
      "res.partner",
      "search_read",
      [[["id", "=", customerId]]],
      { fields: ["x_tax_exempt"], limit: 1 },
    );

    const isExempt = partners?.[0]?.x_tax_exempt;

    if (isExempt) {
      const fpId = await getTaxExemptFiscalPositionId();
      if (fpId) {
        console.log(`[TAX] Customer ${customerId} is tax-exempt → fiscal position ${fpId}`);
        return fpId;
      }
    }
  }

  // ── 2. Check tax holiday ──────────────────────────────────────────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const holiday = await TaxSettings.findOne({
    type: "holiday",
    startDate: { $lte: today },
    endDate: { $gte: today },
    active: true,
  });

  if (holiday) {
    const fpId = await getTaxHolidayFiscalPositionId();
    if (fpId) {
      console.log(`[TAX] Tax holiday active (${holiday.label}) → fiscal position ${fpId}`);
      return fpId;
    }
  }

  // ── 3. Normal — ABCT applies ──────────────────────────────────────────────
  return false;
};

// ─── Clear cache (useful for testing) ────────────────────────────────────────
export const clearTaxCache = () => {
  _abctTaxId = null;
  _taxExemptFiscalPositionId = null;
  _taxHolidayFiscalPositionId = null;
};