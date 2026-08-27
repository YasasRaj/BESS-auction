import express from "express";
import Joi from "joi";
import {
  isAuthenticated,
  authorizeRoles,
} from "../middleware/authMiddleWare.js";
import {
  getAllAuctions,
  getAuctionById,
  certifyAuction,
  annulAuction,
  getAssignedCertifications,
  getCertificationById,
  updateCertificationStatus,
} from "../controllers/certifierController.js";

const router = express.Router();

// Apply auth middleware to ALL certifier routes
router.use(isAuthenticated, authorizeRoles("Certifier"));

// --- Validation Schemas ---

const updateCertificationSchema = Joi.object({
  status: Joi.string().valid("APPROVED", "REJECTED", "UNDER_REVIEW").required(),
  notes: Joi.string().trim().optional().allow(""),
});

const certifyAuctionSchema = Joi.object({
  notes: Joi.string().trim().optional().allow(""),
});

const annulAuctionSchema = Joi.object({
  reason: Joi.string().trim().required().messages({
    "string.empty": "An explicit reason is required to annul an auction.",
    "any.required": "An explicit reason is required to annul an auction.",
  }),
});

// --- Validation Middlewares ---

const validateCertificationBody = (req, res, next) => {
  const { error, value } = updateCertificationSchema.validate(req.body, {
    abortEarly: true,
  });
  if (error) {
    return res
      .status(400)
      .json({ success: false, message: error.details[0].message });
  }
  req.body = value;
  next();
};

const validateCertifyAuctionBody = (req, res, next) => {
  const { error, value } = certifyAuctionSchema.validate(req.body, {
    abortEarly: true,
  });
  if (error) {
    return res
      .status(400)
      .json({ success: false, message: error.details[0].message });
  }
  req.body = value;
  next();
};

const validateAnnulAuctionBody = (req, res, next) => {
  const { error, value } = annulAuctionSchema.validate(req.body, {
    abortEarly: true,
  });
  if (error) {
    return res
      .status(400)
      .json({ success: false, message: error.details[0].message });
  }
  req.body = value;
  next();
};

// --- Route Definitions ---

router.get("/auctions", getAllAuctions);
router.get("/auction/:id", getAuctionById);

// New Action Routes for Certifying and Annulling Auctions
router.post("/auction/:id/certify", validateCertifyAuctionBody, certifyAuction);
router.post("/auction/:id/annul", validateAnnulAuctionBody, annulAuction);

router.get("/certifications", getAssignedCertifications);
router.get("/certifications/:id", getCertificationById);
router.put(
  "/certifications/:id/status",
  validateCertificationBody,
  updateCertificationStatus,
);

export default router;
