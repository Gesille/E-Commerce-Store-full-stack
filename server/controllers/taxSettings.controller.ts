import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncError.js";
import ErrorHandler from "../utils/ErrorHandler.js";
import TaxSettings from "../models/taxSettings.model.js";
import { odooRequest } from "../odoo/odoo.client.js";
import {
  getABCTTaxId,
  getTaxExemptFiscalPositionId,
  getTaxHolidayFiscalPositionId,
  clearTaxCache,
} from "../services/tax.service.js";

// ─────────────────────────────────────────────────────────────────────────────
// TAX HOLIDAYS
// ─────────────────────────────────────────────────────────────────────────────

export const getHolidays = CatchAsyncError(
  async (req: Request, res: Response) => {
    const holidays = await TaxSettings.find({ type: "holiday" })
      .sort({ startDate: -1 })
      .lean();

    res.json({ success: true, count: holidays.length, holidays });
  },
);


export const createHoliday = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { label, startDate, endDate } = req.body;

    if (!label)     return next(new ErrorHandler("label is required", 400));
    if (!startDate) return next(new ErrorHandler("startDate is required", 400));
    if (!endDate)   return next(new ErrorHandler("endDate is required", 400));

    const start = new Date(startDate);
    const end   = new Date(endDate);

    if (isNaN(start.getTime())) return next(new ErrorHandler("Invalid startDate", 400));
    if (isNaN(end.getTime()))   return next(new ErrorHandler("Invalid endDate", 400));
    if (end < start)            return next(new ErrorHandler("endDate must be after startDate", 400));

    const holiday = await TaxSettings.create({
      type: "holiday",
      label,
      startDate: start,
      endDate: end,
      active: true,
    });

    res.status(201).json({ success: true, holiday });
  },
);


export const updateHoliday = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { label, startDate, endDate, active } = req.body;

    const holiday = await TaxSettings.findOne({ _id: id, type: "holiday" });
    if (!holiday) return next(new ErrorHandler("Holiday not found", 404));

    if (label     !== undefined) holiday.label     = label;
    if (active    !== undefined) holiday.active    = active;
    if (startDate !== undefined) holiday.startDate = new Date(startDate);
    if (endDate   !== undefined) holiday.endDate   = new Date(endDate);

    if (holiday.endDate < holiday.startDate) {
      return next(new ErrorHandler("endDate must be after startDate", 400));
    }

    await holiday.save();
    res.json({ success: true, holiday });
  },
);


export const deleteHoliday = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const deleted = await TaxSettings.findOneAndDelete({ _id: id, type: "holiday" });
    if (!deleted) return next(new ErrorHandler("Holiday not found", 404));
    res.json({ success: true, message: "Holiday deleted" });
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOMER EXEMPTIONS
// ─────────────────────────────────────────────────────────────────────────────


export const getExemptCustomers = CatchAsyncError(
  async (req: Request, res: Response) => {
    const customers = await odooRequest(
      "res.partner",
      "search_read",
      [[["x_tax_exempt", "=", true], ["customer_rank", ">", 0]]],
      {
        fields: ["id", "name", "email", "phone", "is_company", "x_tax_exempt"],
        limit: 200,
      },
    );

    res.json({ success: true, count: customers.length, customers });
  },
);


export const setCustomerExemption = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const odooPartnerId = Number(req.params.odooPartnerId);
    const { exempt } = req.body;

    if (!odooPartnerId || isNaN(odooPartnerId)) {
      return next(new ErrorHandler("Valid odooPartnerId is required", 400));
    }
    if (typeof exempt !== "boolean") {
      return next(new ErrorHandler("exempt must be a boolean", 400));
    }

    // Verify partner exists
    const partners = await odooRequest(
      "res.partner",
      "search_read",
      [[["id", "=", odooPartnerId]]],
      { fields: ["id", "name"], limit: 1 },
    );

    if (!partners.length) {
      return next(new ErrorHandler("Customer not found in Odoo", 404));
    }

   
    const writePayload: Record<string, any> = { x_tax_exempt: exempt };

    if (exempt) {
   
      const fpId = await getTaxExemptFiscalPositionId();
      if (fpId) {
        writePayload.property_account_position_id = fpId;
      }
    } else {
     
      writePayload.property_account_position_id = false;
    }

    await odooRequest("res.partner", "write", [[odooPartnerId], writePayload]);

    res.json({
      success: true,
      message: exempt
        ? `Customer ${partners[0].name} is now tax-exempt`
        : `Customer ${partners[0].name} tax exemption removed`,
      odooPartnerId,
      exempt,
    });
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// DIAGNOSTICS
// ─────────────────────────────────────────────────────────────────────────────

export const getTaxStatus = CatchAsyncError(
  async (req: Request, res: Response) => {
    const [abctId, taxExemptFpId, taxHolidayFpId] = await Promise.all([
      getABCTTaxId(),
      getTaxExemptFiscalPositionId(),
      getTaxHolidayFiscalPositionId(),
    ]);

    // Check today's holiday status
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const activeHoliday = await TaxSettings.findOne({
      type: "holiday",
      startDate: { $lte: today },
      endDate: { $gte: today },
      active: true,
    }).lean();

    res.json({
      success: true,
      odoo: {
        abctTax: abctId
          ? { id: abctId, status: "✅ Found" }
          : { id: null, status: "❌ Not found — create ABCT tax in Odoo" },
        taxExemptFiscalPosition: taxExemptFpId
          ? { id: taxExemptFpId, status: "✅ Found" }
          : { id: null, status: "❌ Not found — create 'Tax Exempt' fiscal position in Odoo" },
        taxHolidayFiscalPosition: taxHolidayFpId
          ? { id: taxHolidayFpId, status: "✅ Found" }
          : { id: null, status: "❌ Not found — create 'Tax Holiday' fiscal position in Odoo" },
      },
      today: {
        isHoliday: !!activeHoliday,
        activeHoliday: activeHoliday ?? null,
      },
    });
  },
);


export const clearTaxCacheEndpoint = CatchAsyncError(
  async (req: Request, res: Response) => {
    clearTaxCache();
    res.json({ success: true, message: "Tax cache cleared" });
  },
);