import express from "express";
import {
  isAuthenticated,
  authorizeRoles,
} from "../middleware/authMiddleWare.js";
import {
  getBidderStatus,
  getBidderAuctions,
  registerForAuction,
  getAuctionBidDetails,
  placeBid,
} from "../controllers/bidderController.js";

const router = express.Router();

// Apply auth middleware to all bidder routes
router.use(isAuthenticated, authorizeRoles("Bidder"));

/**
 * GET /api/bidder/status
 * Retrieves the current logged-in bidder's status, clearance info,
 * and associated daytime tariff details.
 */
router.get("/status", getBidderStatus);

/**
 * GET /api/bidder/auctions
 * Retrieves all OPEN and PENDING auctions with registration status.
 */
router.get("/auctions", getBidderAuctions);

/**
 * POST /api/bidder/auctions/:id/register
 * Registers the logged-in bidder for a PENDING auction.
 */
router.post("/auctions/:id/register", registerForAuction);

// Bidding endpoints
router.get("/auctions/:id/bid-details", getAuctionBidDetails);
router.post("/auctions/:id/bid", placeBid);

export default router;
