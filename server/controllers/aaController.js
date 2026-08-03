import pool from "../config/db.js";

/**
 * Helper to clean JS ISO strings into MySQL DATETIME format (YYYY-MM-DD HH:MM:SS)
 */
const formatForMySQL = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19).replace("T", " ");
};

// GET /api/aa/auctions
export const getAllAuctions = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT 
         a.id, 
         a.title, 
         a.quarter, 
         a.year, 
         COALESCE(SUM(bi.cleared_inverter_rating_kw), 0) AS registered_cap_kw,
         a.quarterly_cap_kw, 
         a.ceiling_delta,
         a.cutoff_price, 
         a.min_decrement, 
         a.bid_precision, 
         a.eta_ref, 
         a.opens_at, 
         a.closes_at, 
         a.peak_window_start, 
         a.peak_window_end, 
         a.revision_budget, 
         a.status, 
         a.created_by_user_id, 
         COALESCE(CONCAT(u.first_name, ' ', u.last_name), CONCAT('User #', a.created_by_user_id)) AS created_by_name,
         a.created_at, 
         a.updated_at
       FROM auctions a
       LEFT JOIN users u ON a.created_by_user_id = u.id
       LEFT JOIN auction_registrations ar ON a.id = ar.auction_id
       LEFT JOIN bidder_info bi ON ar.bidder_id = bi.id
       GROUP BY a.id
       ORDER BY a.updated_at DESC`,
    );

    return res.status(200).json({
      success: true,
      count: rows.length,
      auctions: rows,
    });
  } catch (error) {
    console.error("Error fetching auctions:", error);
    return res.status(500).json({
      message: "Internal server error while fetching overview.",
      error: error.message,
    });
  }
};

// GET /api/aa/auctions/:id
export const getAuctionById = async (req, res) => {
  const auctionId = req.params.id;

  try {
    const [rows] = await pool.execute(
      `SELECT 
         a.id, 
         a.title, 
         a.quarter, 
         a.year, 
         COALESCE(SUM(bi.cleared_inverter_rating_kw), 0) AS registered_cap_kw,
         a.quarterly_cap_kw, 
         a.ceiling_delta, 
         a.cutoff_price,
         a.min_decrement, 
         a.bid_precision, 
         a.eta_ref, 
         a.opens_at, 
         a.closes_at, 
         a.peak_window_start, 
         a.peak_window_end, 
         a.revision_budget, 
         a.status, 
         a.created_by_user_id, 
         COALESCE(CONCAT(u.first_name, ' ', u.last_name), CONCAT('User #', a.created_by_user_id)) AS created_by_name,
         a.created_at, 
         a.updated_at
       FROM auctions a
       LEFT JOIN users u ON a.created_by_user_id = u.id
       LEFT JOIN auction_registrations ar ON a.id = ar.auction_id
       LEFT JOIN bidder_info bi ON ar.bidder_id = bi.id
       WHERE a.id = ?
       GROUP BY a.id`,
      [auctionId],
    );

    if (!rows || rows.length === 0) {
      return res
        .status(404)
        .json({ message: `Auction #${auctionId} not found.` });
    }

    return res.status(200).json({
      success: true,
      auction: rows[0],
    });
  } catch (error) {
    console.error("Error fetching single auction:", error);
    return res.status(500).json({
      message: "Internal server error while fetching auction details.",
      error: error.message,
    });
  }
};

// POST /api/aa/create-auction
export const createAuction = async (req, res) => {
  let connection = null;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const {
      title,
      quarterly_cap_kw,
      ceiling_delta,
      min_decrement,
      bid_precision,
      eta_ref,
      opens_at,
      closes_at,
      peak_window_start,
      peak_window_end,
      revision_budget,
      quarter,
      year,
      status,
    } = req.body;

    const mysqlOpensAt = formatForMySQL(opens_at);
    const mysqlClosesAt = formatForMySQL(closes_at);
    const userId = req.user?.id || req.body.created_by_user_id;

    const sql = `
      INSERT INTO auctions (
        title, quarter, year, quarterly_cap_kw, eta_ref, ceiling_delta, cutoff_price,
        min_decrement, bid_precision, revision_budget, peak_window_start,
        peak_window_end, opens_at, closes_at, status, created_by_user_id,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    const [result] = await connection.execute(sql, [
      title,
      quarter,
      year,
      quarterly_cap_kw,
      eta_ref,
      ceiling_delta,
      ceiling_delta,
      min_decrement,
      bid_precision,
      revision_budget,
      peak_window_start,
      peak_window_end,
      mysqlOpensAt,
      mysqlClosesAt,
      status || "DRAFT",
      userId,
    ]);

    await connection.commit();

    return res.status(201).json({
      success: true,
      message:
        status === "DRAFT"
          ? "Auction draft saved successfully."
          : "Auction created and set to PENDING.",
      auction_id: result.insertId,
      status,
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error creating auction:", error);
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

// PUT /api/aa/auctions/:id
export const updateAuction = async (req, res) => {
  const auctionId = req.params.id;
  let connection = null;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [existing] = await connection.execute(
      `SELECT id, status FROM auctions WHERE id = ? FOR UPDATE`,
      [auctionId],
    );

    if (!existing || existing.length === 0) {
      await connection.rollback();
      return res
        .status(404)
        .json({ message: `Auction #${auctionId} not found.` });
    }

    const {
      title,
      quarterly_cap_kw,
      ceiling_delta,
      min_decrement,
      bid_precision,
      eta_ref,
      opens_at,
      closes_at,
      peak_window_start,
      peak_window_end,
      revision_budget,
      quarter,
      year,
      status,
    } = req.body;

    const mysqlOpensAt = formatForMySQL(opens_at);
    const mysqlClosesAt = formatForMySQL(closes_at);

    await connection.execute(
      `UPDATE auctions SET
        title = ?, quarter = ?, year = ?, quarterly_cap_kw = ?, eta_ref = ?,
        ceiling_delta = ?, cutoff_price = ?, min_decrement = ?, bid_precision = ?, revision_budget = ?,
        peak_window_start = ?, peak_window_end = ?, opens_at = ?, closes_at = ?,
        status = ?, updated_at = NOW()
       WHERE id = ?`,
      [
        title,
        quarter,
        year,
        quarterly_cap_kw,
        eta_ref,
        ceiling_delta,
        ceiling_delta,
        min_decrement,
        bid_precision,
        revision_budget,
        peak_window_start,
        peak_window_end,
        mysqlOpensAt,
        mysqlClosesAt,
        status,
        auctionId,
      ],
    );

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Auction updated successfully.",
      auction_id: Number(auctionId),
      status,
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error updating auction:", error);
    return res.status(500).json({
      message: "Internal server error while updating auction.",
      error: error.message,
    });
  } finally {
    if (connection) connection.release();
  }
};

// ============================================================================
// TEMPORARY ROUTES - TO BE REMOVED / REFACTORED IN PRODUCTION
// ============================================================================

/**
 * GET /api/aa/bids
 * TEMPORARY: Fetches all bids across all auctions including auction title and bidder details.
 */
export const getAllBids = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT 
         b.id,
         b.auction_id,
         a.title AS auction_name,
         b.bidder_id,
         bi.prosumer_name,
         bi.dl_reference_id,
         bi.cleared_inverter_rating_kw,
         b.bid_value,
         b.bid_status,
         b.bid_time,
         b.created_at
       FROM bids b
       LEFT JOIN auctions a ON b.auction_id = a.id
       LEFT JOIN bidder_info bi ON b.bidder_id = bi.id
       ORDER BY b.created_at DESC`,
    );

    return res.status(200).json({
      success: true,
      count: rows.length,
      bids: rows,
    });
  } catch (error) {
    console.error("Error fetching all bids (TEMPORARY ROUTE):", error);
    return res.status(500).json({
      message: "Internal server error while fetching bids.",
      error: error.message,
    });
  }
};

// ============================================================================
// END OF TEMPORARY ROUTES
// ============================================================================

// ============================================================================
// END OF CODE
// ============================================================================
