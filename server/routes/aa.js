//need to split to controller and routes in the future
import express from "express";
import Joi from "joi";
import {
  isAuthenticated,
  authorizeRoles,
} from "../middleware/authMiddleware.js";
import {
  getAllAuctions,
  getAuctionById,
  createAuction,
  updateAuction,
  getAllBids, //remove in production code
} from "../controllers/aaController.js";

const router = express.Router();

// Joi Schema Validation Middleware
const createAuctionSchema = Joi.object({
  id: Joi.alternatives()
    .try(Joi.number().integer().positive(), Joi.string())
    .optional(),
  title: Joi.string().trim().required().messages({
    "string.empty": "Auction title is required.",
    "any.required": "Auction title is required.",
  }),
  quarter: Joi.string().valid("Q1", "Q2", "Q3", "Q4").required(),
  year: Joi.number().integer().min(2024).max(2035).required(),
  quarterly_cap_kw: Joi.number().positive().required(),
  eta_ref: Joi.number().positive().required(),
  ceiling_delta: Joi.number().min(0).required(),
  min_decrement: Joi.number().positive().required(),
  bid_precision: Joi.number().integer().min(0).max(4).required(),
  revision_budget: Joi.number().integer().min(0).required(),
  peak_window_start: Joi.string().required(),
  peak_window_end: Joi.string().required(),
  opens_at: Joi.string().isoDate().required(),
  closes_at: Joi.string().isoDate().required(),
  status: Joi.string().valid("DRAFT", "PENDING").default("DRAFT"),
  created_by_user_id: Joi.any().optional(),
});

const validateAuctionBody = (req, res, next) => {
  const { error, value } = createAuctionSchema.validate(req.body, {
    abortEarly: true,
  });

  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  req.body = value;
  next();
};

// Route Definitions
router.get(
  "/auctions",
  isAuthenticated,
  authorizeRoles("Auction Admin"),
  getAllAuctions,
);

router.get(
  "/auctions/:id",
  isAuthenticated,
  authorizeRoles("Auction Admin"),
  getAuctionById,
);

router.post(
  "/create-auction",
  isAuthenticated,
  authorizeRoles("Auction Admin"),
  validateAuctionBody,
  createAuction,
);

router.put(
  "/auctions/:id",
  isAuthenticated,
  authorizeRoles("Auction Admin"),
  validateAuctionBody,
  updateAuction,
);

// TEMPORARY ROUTE
router.get("/bids", getAllBids);

export default router;
