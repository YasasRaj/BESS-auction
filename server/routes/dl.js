import express from "express";
import Joi from "joi";
import db from "../config/db.js"; // Note: ensure file extension is included if needed
import {
  isAuthenticated,
  authorizeRoles,
} from "../middleware/authMiddleWare.js";
const router = express.Router();

/**
 * Strips '+' and standard formatting characters (spaces, dashes, parentheses)
 * without altering the underlying digits or country code.
 * @param {string | number | null | undefined} phone
 * @returns {string}
 */
function cleanPhoneNumber(phone) {
  if (!phone) return "";
  return phone
    .toString()
    .replace(/\+/g, "")
    .replace(/[\s\-\(\)]/g, "");
}

/**
 * Helper to convert empty strings or undefined to null for SQL safety
 * @param {unknown} val
 * @returns {unknown}
 */
function parseNull(val) {
  return val === "" || val === undefined ? null : val;
}

/**
 * Calculates term_days as the lesser of:
 * 1. Days from today until fit_end_date
 * 2. 12 years from today (in days, considering leap years ~4383 days)
 * @param {string | null | undefined} fitEndDateStr
 * @returns {number}
 */
function calculateTermDays(fitEndDateStr) {
  const today = new Date();

  // 12 years from today
  const twelveYearsLater = new Date(today);
  twelveYearsLater.setFullYear(today.getFullYear() + 12);

  const msPerDay = 1000 * 60 * 60 * 24;
  const twelveYearsInDays = Math.round(
    (twelveYearsLater - today.getTime()) / msPerDay,
  );

  if (!fitEndDateStr) {
    return twelveYearsInDays;
  }

  const fitEndDate = new Date(fitEndDateStr);
  const fitEndInDays = Math.round(
    (fitEndDate.getTime() - today.getTime()) / msPerDay,
  );

  if (isNaN(fitEndInDays) || fitEndInDays <= 0) {
    return twelveYearsInDays;
  }

  return Math.min(fitEndInDays, twelveYearsInDays);
}

// ==========================================
// JOI SCHEMAS
// ==========================================

const bidderInfoSchema = Joi.object({
  mobile_number: Joi.string().trim().required().messages({
    "string.empty": "Mobile number is required.",
    "any.required": "Mobile number is required.",
  }),
  prosumer_name: Joi.string().trim().required().messages({
    "string.empty": "Prosumer name is required.",
    "any.required": "Prosumer name is required.",
  }),
  nic: Joi.string().trim().required().messages({
    "string.empty": "NIC is required.",
    "any.required": "NIC is required.",
  }),
  dl_reference_id: Joi.string().trim().required().messages({
    "string.empty": "DL Reference ID is required.",
    "any.required": "DL Reference ID is required.",
  }),
  cleared_inverter_rating_kw: Joi.number().positive().required().messages({
    "number.base": "Cleared inverter rating (kW) must be a number.",
    "number.positive":
      "Cleared inverter rating (kW) must be a positive number.",
    "any.required": "Cleared inverter rating (kW) is required.",
  }),
});

const daytimeTariffDetailsSchema = Joi.object({
  scheme: Joi.string()
    .valid("Net Accounting", "Net Plus", "Net Plus Plus")
    .optional()
    .messages({
      "any.only":
        "Invalid scheme. 'Net Metering' is not eligible. Must be one of: Net Accounting, Net Plus, Net Plus Plus",
    }),
  daytime_fit_basis: Joi.string()
    .valid("Legacy Vintage", "PUCSL Rate")
    .optional()
    .messages({
      "any.only":
        "Invalid daytime_fit_basis. Must be one of: Legacy Vintage, PUCSL Rate",
    }),
  solar_connection_agreement_start_date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .allow(null, "")
    .optional()
    .messages({
      "string.pattern.base":
        "Invalid solar_connection_agreement_start_date format. Expected YYYY-MM-DD.",
    }),
  daytime_fit_lkr_kwh: Joi.number().min(0).allow(null, "").optional().messages({
    "number.base": "daytime_fit_lkr_kwh must be a valid number.",
  }),
  daytime_fit2_lkr_kwh: Joi.number()
    .min(0)
    .allow(null, "")
    .optional()
    .messages({
      "number.base": "daytime_fit2_lkr_kwh must be a valid number.",
    }),
  fit_step_date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .allow(null, "")
    .optional()
    .messages({
      "string.pattern.base":
        "Invalid fit_step_date format. Expected YYYY-MM-DD.",
    }),
  fit_end_date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .allow(null, "")
    .optional()
    .messages({
      "string.pattern.base":
        "Invalid fit_end_date format. Expected YYYY-MM-DD.",
    }),
});

const applicantSubmissionSchema = Joi.object({
  bidder_info: bidderInfoSchema.required().messages({
    "any.required": "Missing required 'bidder_info' object.",
  }),
  daytime_tariff_details: daytimeTariffDetailsSchema.required().messages({
    "any.required": "Missing required 'daytime_tariff_details' object.",
  }),
});

// POST /api/dl/submit-applicant
router.post(
  "/submit-applicant",
  isAuthenticated,
  authorizeRoles("DL Officer"),
  async (req, res) => {
    // --- 1. JOI VALIDATION ---
    const { error, value } = applicantSubmissionSchema.validate(req.body, {
      abortEarly: true,
    });

    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { bidder_info, daytime_tariff_details } = value;
    const {
      mobile_number,
      prosumer_name,
      nic,
      dl_reference_id,
      cleared_inverter_rating_kw,
    } = bidder_info;

    // --- 2. DATABASE EXECUTION & TRANSACTION ---
    const cleanedPhone = cleanPhoneNumber(mobile_number);
    /** @type {import('mysql2/promise').PoolConnection | null} */
    let connection = null;
    let inTransaction = false;

    try {
      connection = await db.getConnection();
      await connection.beginTransaction();
      inTransaction = true;

      // --- A. USER LOOKUP ---
      const [users] =
        /** @type {import('mysql2/promise').RowDataPacket[][]} */ (
          await connection.execute(
            `SELECT id FROM users 
            WHERE REPLACE(REPLACE(REPLACE(REPLACE(phone_number, '+', ''), ' ', ''), '-', ''), '(', '') = ?
               OR phone_number = ?
            LIMIT 1`,
            [cleanedPhone, mobile_number],
          )
        );

      // Log lookup result for tracking
      if (!users || users.length === 0) {
        console.warn(
          `⚠️ User lookup failed: Phone number '${mobile_number}' (cleaned: '${cleanedPhone}') was NOT found in the database.`,
        );
        await connection.rollback();
        return res.status(404).json({
          message: `User with mobile number '${mobile_number}' is not registered in the system.`,
        });
      }

      console.log(
        `✅ User lookup success: Phone number '${mobile_number}' matched user ID: ${users[0].id}`,
      );
      const userId = users[0].id;

      // --- B. BLOCK EXISTING BIDDER RECORD ---
      const [existingBidders] =
        /** @type {import('mysql2/promise').RowDataPacket[][]} */ (
          await connection.execute(
            `SELECT id, dl_reference_id, nic, user_id FROM bidder_info 
            WHERE dl_reference_id = ? OR nic = ? OR user_id = ? 
            LIMIT 1`,
            [dl_reference_id, nic, userId],
          )
        );

      if (existingBidders && existingBidders.length > 0) {
        await connection.rollback();
        const match = existingBidders[0];
        let reason = "DL Reference ID";
        if (match.nic === nic) reason = "NIC";
        if (match.user_id === userId) reason = "Registered User";

        return res.status(409).json({
          message: `Submission blocked: A bidder record already exists for this ${reason}. Duplicate entries are not allowed.`,
        });
      }

      // --- C. CHECK EXISTING TARIFF RECORD OR ENFORCE REQUIRED FIELDS ---
      const finalTariff = { ...daytime_tariff_details };

      const [existingTariff] =
        /** @type {import('mysql2/promise').RowDataPacket[][]} */ (
          await connection.execute(
            `SELECT * FROM daytime_tariff_details WHERE dl_reference_id = ? LIMIT 1`,
            [dl_reference_id],
          )
        );

      const hasExistingTariff = existingTariff && existingTariff.length > 0;

      if (hasExistingTariff) {
        const existing = existingTariff[0];
        finalTariff.scheme = finalTariff.scheme || existing.scheme;
        finalTariff.daytime_fit_basis =
          finalTariff.daytime_fit_basis || existing.daytime_fit_basis;
        finalTariff.solar_connection_agreement_start_date =
          finalTariff.solar_connection_agreement_start_date ||
          existing.solar_connection_agreement_start_date;
        finalTariff.daytime_fit_lkr_kwh =
          finalTariff.daytime_fit_lkr_kwh ?? existing.daytime_fit_lkr_kwh;
        finalTariff.daytime_fit2_lkr_kwh =
          finalTariff.daytime_fit2_lkr_kwh ?? existing.daytime_fit2_lkr_kwh;
        finalTariff.fit_step_date =
          finalTariff.fit_step_date || existing.fit_step_date;
        finalTariff.fit_end_date =
          finalTariff.fit_end_date || existing.fit_end_date;
      } else {
        const missingFields = [];

        if (!finalTariff.scheme) missingFields.push("scheme");
        if (!finalTariff.daytime_fit_basis)
          missingFields.push("daytime_fit_basis");
        if (!finalTariff.solar_connection_agreement_start_date)
          missingFields.push("solar_connection_agreement_start_date");
        if (
          finalTariff.daytime_fit_lkr_kwh === undefined ||
          finalTariff.daytime_fit_lkr_kwh === null ||
          finalTariff.daytime_fit_lkr_kwh === ""
        ) {
          missingFields.push("daytime_fit_lkr_kwh");
        }

        if (missingFields.length > 0) {
          await connection.rollback();
          return res.status(400).json({
            message: `Daytime Tariff details record does not exist for DL Reference ID '${dl_reference_id}'. Missing required fields: ${missingFields.join(", ")}.`,
          });
        }
      }

      if (finalTariff.daytime_fit_basis === "PUCSL Rate") {
        finalTariff.fit_step_date = null;
        finalTariff.daytime_fit2_lkr_kwh = null;
      }

      const computedTermDays = calculateTermDays(finalTariff.fit_end_date);

      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

      // --- D. INSERT INTO bidder_info ---
      const [bidderResult] =
        /** @type {import('mysql2/promise').ResultSetHeader[]} */ (
          await connection.execute(
            `INSERT INTO bidder_info (
            user_id,
            status,
            auctions_left,
            mobile_number,
            prosumer_name,
            nic,
            dl_reference_id,
            cleared_inverter_rating_kw,
            clearance_date,
            term_days
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              userId,
              "Active",
              3,
              mobile_number,
              prosumer_name,
              nic,
              dl_reference_id,
              cleared_inverter_rating_kw,
              todayStr,
              computedTermDays,
            ],
          )
        );

      // --- E. UPDATE OR INSERT INTO daytime_tariff_details ---
      if (hasExistingTariff) {
        await connection.execute(
          `UPDATE daytime_tariff_details SET
            scheme = ?,
            daytime_fit_basis = ?,
            solar_connection_agreement_start_date = ?,
            daytime_fit_lkr_kwh = ?,
            daytime_fit2_lkr_kwh = ?,
            fit_step_date = ?,
            fit_end_date = ?
           WHERE dl_reference_id = ?`,
          [
            parseNull(finalTariff.scheme),
            parseNull(finalTariff.daytime_fit_basis),
            parseNull(finalTariff.solar_connection_agreement_start_date),
            parseNull(finalTariff.daytime_fit_lkr_kwh),
            parseNull(finalTariff.daytime_fit2_lkr_kwh),
            parseNull(finalTariff.fit_step_date),
            parseNull(finalTariff.fit_end_date),
            dl_reference_id,
          ],
        );
      } else {
        await connection.execute(
          `INSERT INTO daytime_tariff_details (
            dl_reference_id,
            scheme,
            daytime_fit_basis,
            solar_connection_agreement_start_date,
            daytime_fit_lkr_kwh,
            daytime_fit2_lkr_kwh,
            fit_step_date,
            fit_end_date
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            dl_reference_id,
            parseNull(finalTariff.scheme),
            parseNull(finalTariff.daytime_fit_basis),
            parseNull(finalTariff.solar_connection_agreement_start_date),
            parseNull(finalTariff.daytime_fit_lkr_kwh),
            parseNull(finalTariff.daytime_fit2_lkr_kwh),
            parseNull(finalTariff.fit_step_date),
            parseNull(finalTariff.fit_end_date),
          ],
        );
      }

      await connection.commit();

      return res.status(201).json({
        success: true,
        message: "Applicant submitted successfully.",
        user_id: userId,
        computed_term_days: computedTermDays,
        bidder_info_id: bidderResult.insertId,
      });
    } catch (error) {
      if (connection && inTransaction) {
        await connection.rollback();
      }
      console.error("Error submitting applicant:", error);

      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred.";

      return res.status(500).json({
        message: "Internal server error while saving applicant data.",
        error: errorMessage,
      });
    } finally {
      if (connection) connection.release();
    }
  },
);

export default router;
