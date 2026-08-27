import pool from "../config/db.js";

/**
 * GET /api/certifier/auctions
 * Retrieve all auctions for certifier view
 */
export const getAllAuctions = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT 
         a.id, 
         a.title, 
         CAST(a.ceiling_delta AS DOUBLE) AS ceiling_delta,
         CAST(a.eta_ref AS DOUBLE) AS eta_ref,
         a.quarter, 
         a.year, 
         CAST(a.quarterly_cap_kw AS DOUBLE) AS quarterly_cap_kw, 
         a.opens_at, 
         a.closes_at, 
         a.status, 
         a.created_at, 
         a.updated_at
       FROM auctions a
       ORDER BY a.updated_at DESC`,
    );

    return res.status(200).json({
      success: true,
      count: rows.length,
      auctions: rows,
    });
  } catch (error) {
    console.error("Error fetching auctions for certifier:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching auctions.",
      error: error.message,
    });
  }
};

/**
 * GET /api/certifier/auction/:id
 * Retrieve specific auction along with Bids, Registrations, Certifications, and Annulments
 */
export const getAuctionById = async (req, res) => {
  const { id } = req.params;

  // --- Console log the auction ID on the server terminal ---
  console.log("Server-side Auction ID fetched:", id);

  try {
    // 1. Fetch core auction details matching SQL schema
    const [auctionRows] = await pool.execute(
      `SELECT 
         a.id, 
         a.title, 
         CAST(a.ceiling_delta AS DOUBLE) AS ceiling_delta,
         CAST(a.eta_ref AS DOUBLE) AS eta_ref,
         CAST(a.min_decrement AS DOUBLE) AS min_decrement,
         CAST(a.cutoff_price AS DOUBLE) AS cutoff_price,
         CAST(a.bid_precision AS DOUBLE) AS bid_precision,
         a.quarter, 
         a.year, 
         CAST(a.quarterly_cap_kw AS DOUBLE) AS quarterly_cap_kw, 
         a.opens_at, 
         a.closes_at, 
         a.peak_window_start,
         a.peak_window_end,
         a.revision_budget,
         a.status, 
         a.created_at, 
         a.updated_at
       FROM auctions a
       WHERE a.id = ?`,
      [id],
    );

    if (!auctionRows || auctionRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Auction #${id} not found.`,
      });
    }

    const auction = auctionRows[0];

    // Enforce restriction: Certifier views details for CLOSED or subsequent audit states
    const allowedStatuses = [
      "CLOSED",
      "RESULTS_FROZEN",
      "CERTIFIED",
      "AWARD_RELEASED",
      "ANNULLED",
    ];
    if (!allowedStatuses.includes(auction.status)) {
      return res.status(403).json({
        success: false,
        message: `Access Restricted: Auction #${id} is currently in '${auction.status}' state. Audit details are only available when CLOSED.`,
        auction,
      });
    }

    // 2. Fetch Bids with Prosumer Name, Cleared Inverter Rating, Clearance Date, and DL Officer Name
    const [bids] = await pool.execute(
      `SELECT 
         b.id,
         CAST(b.bid_value AS DOUBLE) AS bid_value,
         b.bid_status,
         b.bid_time,
         b.created_at,
         bi.prosumer_name,
         CAST(bi.cleared_inverter_rating_kw AS DOUBLE) AS cleared_inverter_rating_kw,
         bi.clearance_date,
         CONCAT(u_officer.first_name, ' ', u_officer.last_name) AS dl_clearance_officer_name
       FROM bids b
       JOIN bidder_info bi ON b.bidder_id = bi.user_id
       LEFT JOIN users u_officer ON bi.dl_clearance_officer_id = u_officer.id
       WHERE b.auction_id = ?
       ORDER BY b.bid_time DESC`,
      [id],
    );

    // 3. Fetch Auction Registrations
    const [registrations] = await pool.execute(
      `SELECT 
         ar.id,
         ar.registered_at,
         ar.registration_status,
         ar.bids_left,
         bi.prosumer_name,
         CAST(bi.cleared_inverter_rating_kw AS DOUBLE) AS cleared_inverter_rating_kw,
         bi.clearance_date,
         CONCAT(u_officer.first_name, ' ', u_officer.last_name) AS dl_clearance_officer_name
       FROM auction_registrations ar
       JOIN bidder_info bi ON ar.bidder_id = bi.user_id
       LEFT JOIN users u_officer ON bi.dl_clearance_officer_id = u_officer.id
       WHERE ar.auction_id = ?
       ORDER BY ar.registered_at DESC`,
      [id],
    );

    // 4. Fetch Auction Certifications
    const [certifications] = await pool.execute(
      `SELECT 
         ac.id,
         ac.notes,
         ac.created_at,
         a.title AS auction_title,
         CONCAT(u.first_name, ' ', u.last_name) AS certifier_name
       FROM auction_certifications ac
       JOIN auctions a ON ac.auction_id = a.id
       JOIN users u ON ac.certifier_id = u.id
       WHERE ac.auction_id = ?
       ORDER BY ac.created_at DESC`,
      [id],
    );

    // 5. Fetch Auction Annulments
    const [annulments] = await pool.execute(
      `SELECT 
         aa.id,
         aa.reason,
         aa.created_at,
         a.title AS auction_title,
         CONCAT(u.first_name, ' ', u.last_name) AS certifier_name
       FROM auction_annulments aa
       JOIN auctions a ON aa.auction_id = a.id
       JOIN users u ON aa.certifier_id = u.id
       WHERE aa.auction_id = ?
       ORDER BY aa.created_at DESC`,
      [id],
    );

    console.log("AUCTION:", auction);
    console.log("BIDS:", bids);
    console.log("REGISTRATIONS:", registrations);
    console.log("CERTIFICATIONS:", certifications);
    console.log("ANNULMENTS:", annulments);

    // AFTER: Included auction in 200 JSON payload
    return res.status(200).json({
      success: true,
      auction,
      bids,
      registrations,
      certifications,
      annulments,
    });
  } catch (error) {
    console.error("Error fetching auction details for certifier:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching auction details.",
      error: error.message,
    });
  }
};

/**
 * POST /api/certifier/auctions/:id/certify
 */
export const certifyAuction = async (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;
  const certifierId = req.user?.id;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.execute(
      `INSERT INTO auction_certifications (auction_id, certifier_id, notes)
       VALUES (?, ?, ?)`,
      [id, certifierId, notes || null],
    );

    const [certCountRows] = await connection.execute(
      `SELECT COUNT(*) AS total FROM auction_certifications WHERE auction_id = ?`,
      [id],
    );

    const totalCertifications = certCountRows[0].total;

    if (totalCertifications >= 2) {
      await connection.execute(
        `UPDATE auctions SET status = 'CERTIFIED', updated_at = NOW() WHERE id = ?`,
        [id],
      );
    }

    await connection.commit();

    return res.status(200).json({
      success: true,
      message:
        totalCertifications >= 2
          ? "Certification recorded. Threshold met—auction is now CERTIFIED."
          : "Certification recorded. Awaiting second approval.",
      total_certifications: totalCertifications,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error submitting certification:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({
        success: false,
        message: "You have already submitted a certification for this auction.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error while submitting certification.",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

/**
 * POST /api/certifier/auctions/:id/annul
 */
export const annulAuction = async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const certifierId = req.user?.id;

  if (!reason || !reason.trim()) {
    return res.status(400).json({
      success: false,
      message: "An explicit reason is required to annul an auction.",
    });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.execute(
      `INSERT INTO auction_annulments (auction_id, certifier_id, reason)
       VALUES (?, ?, ?)`,
      [id, certifierId, reason],
    );

    await connection.execute(
      `UPDATE auctions SET status = 'ANNULLED', updated_at = NOW() WHERE id = ?`,
      [id],
    );

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Auction successfully ANNULLED.",
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error submitting annulment:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({
        success: false,
        message: "You have already submitted an annulment for this auction.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error while submitting annulment.",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

/**
 * GET /api/certifier/certifications
 */
export const getAssignedCertifications = async (req, res) => {
  try {
    const certifierId = req.user?.id;

    const [rows] = await pool.execute(
      `SELECT 
         c.id,
         c.bidder_id,
         bi.prosumer_name,
         c.status,
         c.submitted_at,
         c.updated_at
       FROM certifications c
       LEFT JOIN bidder_info bi ON c.bidder_id = bi.id
       WHERE c.certifier_id = ? OR c.certifier_id IS NULL
       ORDER BY c.updated_at DESC`,
      [certifierId],
    );

    return res.status(200).json({
      success: true,
      count: rows.length,
      certifications: rows,
    });
  } catch (error) {
    console.error("Error fetching certifier tasks:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching certifications.",
      error: error.message,
    });
  }
};

/**
 * GET /api/certifier/certifications/:id
 */
export const getCertificationById = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await pool.execute(
      `SELECT 
         c.id,
         c.bidder_id,
         bi.prosumer_name,
         bi.dl_reference_id,
         c.status,
         c.notes,
         c.submitted_at,
         c.updated_at
       FROM certifications c
       LEFT JOIN bidder_info bi ON c.bidder_id = bi.id
       WHERE c.id = ?`,
      [id],
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Certification #${id} not found.`,
      });
    }

    return res.status(200).json({
      success: true,
      certification: rows[0],
    });
  } catch (error) {
    console.error("Error fetching certification details:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching certification details.",
      error: error.message,
    });
  }
};

/**
 * PUT /api/certifier/certifications/:id/status
 */
export const updateCertificationStatus = async (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;
  const certifierId = req.user?.id;

  try {
    const [existing] = await pool.execute(
      `SELECT id FROM certifications WHERE id = ?`,
      [id],
    );

    if (!existing || existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Certification #${id} not found.`,
      });
    }

    await pool.execute(
      `UPDATE certifications SET
         status = ?,
         notes = ?,
         certifier_id = ?,
         updated_at = NOW()
       WHERE id = ?`,
      [status, notes || null, certifierId, id],
    );

    return res.status(200).json({
      success: true,
      message: "Certification status updated successfully.",
      certification_id: Number(id),
      status,
    });
  } catch (error) {
    console.error("Error updating certification status:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while updating certification status.",
      error: error.message,
    });
  }
};
