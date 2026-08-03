import db from "../config/db.js";

/**
 * Calculates the cutoff price for an auction based on strict merit order (cumulative kW cap)
 * and updates bid statuses as 'IN' or 'OUT'.
 *
 * @param {import('mysql2/promise').PoolConnection} connection
 * @param {number|string} auctionId
 */
export const recalculateAuctionCutoff = async (connection, auctionId) => {
  // 1. Fetch auction quarterly cap
  const [auctionRows] = await connection.execute(
    `SELECT quarterly_cap_kw FROM auctions WHERE id = ? LIMIT 1 FOR UPDATE`,
    [auctionId],
  );

  if (!auctionRows || auctionRows.length === 0) {
    throw new Error(`Auction ID ${auctionId} not found.`);
  }

  const quarterlyCapKw = Number(auctionRows[0].quarterly_cap_kw);

  // 2. Fetch the lowest bid per bidder for this auction, joined with inverter capacity
  // Tie-breaking: lowest bid_value, then earliest bid_time
  const bidsQuery = `
    SELECT 
      b.id AS bid_id,
      b.bidder_id,
      b.bid_value,
      b.bid_time,
      bi.cleared_inverter_rating_kw
    FROM bids b
    INNER JOIN (
      SELECT bidder_id, MIN(bid_value) AS min_bid_value
      FROM bids
      WHERE auction_id = ?
      GROUP BY bidder_id
    ) lowest_bids 
      ON b.bidder_id = lowest_bids.bidder_id 
     AND b.bid_value = lowest_bids.min_bid_value
    INNER JOIN bidder_info bi ON b.bidder_id = bi.id
    WHERE b.auction_id = ?
    ORDER BY b.bid_value ASC, b.bid_time ASC
  `;

  const [bids] = await connection.execute(bidsQuery, [auctionId, auctionId]);

  let cumulativeKw = 0;
  let cutoffPrice = null;
  const winningBidIds = [];
  const losingBidIds = [];

  // 3. Merit Order Filling
  for (const bid of bids) {
    const bidderKw = Number(bid.cleared_inverter_rating_kw || 0);

    // Hard Stop: Reject if adding this bidder breaches the cap
    if (cumulativeKw + bidderKw > quarterlyCapKw) {
      // Hard stop achieved - stop processing remaining bids (no skip-and-fill)
      break;
    }

    // Accept bid
    cumulativeKw += bidderKw;
    winningBidIds.push(bid.bid_id);
    cutoffPrice = Number(bid.bid_value); // Sets cutoff to highest accepted bid value
  }

  // Collect all bid IDs that were not accepted (including non-lowest historical bids)
  const [allBids] = await connection.execute(
    `SELECT id FROM bids WHERE auction_id = ?`,
    [auctionId],
  );

  allBids.forEach((bidRow) => {
    if (!winningBidIds.includes(bidRow.id)) {
      losingBidIds.push(bidRow.id);
    }
  });

  // 4. Update Auction Cutoff Price
  await connection.execute(
    `UPDATE auctions SET cutoff_price = ? WHERE id = ?`,
    [cutoffPrice, auctionId],
  );

  // 5. Bulk Update Bid Statuses
  if (winningBidIds.length > 0) {
    await connection.execute(
      `UPDATE bids SET bid_status = 'IN' WHERE id IN (${winningBidIds.map(() => "?").join(",")})`,
      winningBidIds,
    );
  }

  if (losingBidIds.length > 0) {
    await connection.execute(
      `UPDATE bids SET bid_status = 'OUT' WHERE id IN (${losingBidIds.map(() => "?").join(",")})`,
      losingBidIds,
    );
  }

  return { cutoffPrice, cumulativeKw, acceptedCount: winningBidIds.length };
};

/**
 * @desc    Retrieves the current logged-in bidder's status, clearance info, and daytime tariff details.
 * @route   GET /api/bidder/status
 * @access  Private (Bidder)
 */
export const getBidderStatus = async (req, res) => {
  let connection = null;

  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User identification missing from request.",
      });
    }

    connection = await db.getConnection();

    const query = `
      SELECT 
        b.id AS bidder_id,
        b.user_id,
        b.status,
        b.auctions_left,
        b.mobile_number,
        b.prosumer_name,
        b.nic,
        b.dl_reference_id,
        b.cleared_inverter_rating_kw,
        b.clearance_date,
        b.term_days,
        b.created_at AS bidder_registered_at,
        t.scheme,
        t.daytime_fit_basis,
        t.solar_connection_agreement_start_date,
        t.daytime_fit_lkr_kwh,
        t.daytime_fit2_lkr_kwh,
        t.fit_step_date,
        t.fit_end_date
      FROM bidder_info b
      LEFT JOIN daytime_tariff_details t 
             ON b.dl_reference_id = t.dl_reference_id
      WHERE b.user_id = ?
      LIMIT 1
    `;

    const [rows] = /** @type {import('mysql2/promise').RowDataPacket[][]} */ (
      await connection.execute(query, [userId])
    );

    if (!rows || rows.length === 0) {
      return res.status(200).json({
        success: true,
        isValidated: false,
        message:
          "No DL clearance record found. Please submit clearance details for validation.",
        bidder_info: null,
        daytime_tariff_details: null,
      });
    }

    const record = rows[0];
    const rawStatus = record.status ? String(record.status).toUpperCase() : "";
    const isValidated = rawStatus === "ACTIVE";

    return res.status(200).json({
      success: true,
      isValidated,
      bidder_info: {
        id: record.bidder_id,
        user_id: record.user_id,
        status: record.status,
        auctions_left: record.auctions_left,
        mobile_number: record.mobile_number,
        prosumer_name: record.prosumer_name,
        nic: record.nic,
        dl_reference_id: record.dl_reference_id,
        cleared_inverter_rating_kw: record.cleared_inverter_rating_kw,
        clearance_date: record.clearance_date,
        term_days: record.term_days,
        registered_at: record.bidder_registered_at,
      },
      daytime_tariff_details: {
        scheme: record.scheme,
        daytime_fit_basis: record.daytime_fit_basis,
        solar_connection_agreement_start_date:
          record.solar_connection_agreement_start_date,
        daytime_fit_lkr_kwh: record.daytime_fit_lkr_kwh,
        daytime_fit2_lkr_kwh: record.daytime_fit2_lkr_kwh,
        fit_step_date: record.fit_step_date,
        fit_end_date: record.fit_end_date,
      },
    });
  } catch (error) {
    console.error("Error fetching bidder status:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching bidder status.",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  } finally {
    if (connection) connection.release();
  }
};

/**
 * @desc    Get all available auctions (OPEN and PENDING) with registration status for bidder
 * @route   GET /api/bidder/auctions
 * @access  Private (Bidder)
 */
export const getBidderAuctions = async (req, res) => {
  let connection = null;

  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User identification missing from request.",
      });
    }

    connection = await db.getConnection();

    const query = `
      SELECT 
        a.id,
        a.title,
        a.ceiling_delta,
        a.eta_ref,
        a.quarterly_cap_kw,
        a.opens_at,
        a.closes_at,
        a.status,
        CASE 
          WHEN ar.bidder_id IS NOT NULL AND ar.registration_status = TRUE THEN TRUE 
          ELSE FALSE 
        END AS user_registered
      FROM auctions a
      LEFT JOIN bidder_info b ON b.user_id = ?
      LEFT JOIN auction_registrations ar 
             ON a.id = ar.auction_id AND ar.bidder_id = b.id
      WHERE UPPER(a.status) IN ('PENDING', 'OPEN')
      ORDER BY a.opens_at ASC
    `;

    const [rows] = /** @type {import('mysql2/promise').RowDataPacket[][]} */ (
      await connection.execute(query, [userId])
    );

    const auctions = rows.map((row) => ({
      id: row.id,
      title: row.title,
      ceiling_delta: Number(row.ceiling_delta),
      eta_ref: Number(row.eta_ref),
      quarterly_cap_kw: Number(row.quarterly_cap_kw),
      opens_at: row.opens_at,
      closes_at: row.closes_at,
      status: row.status,
      user_registered: Boolean(row.user_registered),
    }));

    return res.status(200).json({
      success: true,
      auctions,
    });
  } catch (error) {
    console.error("Error fetching bidder auctions:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching auctions.",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  } finally {
    if (connection) connection.release();
  }
};

/**
 * @desc    Register logged-in bidder for a specific PENDING auction & submit baseline ceiling bid
 * @route   POST /api/bidder/auctions/:id/register
 * @access  Private (Bidder)
 */
export const registerForAuction = async (req, res) => {
  let connection = null;

  try {
    const userId = req.user?.id;
    const { id: auctionId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User identification missing from request.",
      });
    }

    if (!auctionId) {
      return res.status(400).json({
        success: false,
        message: "Auction ID is required.",
      });
    }

    connection = await db.getConnection();
    await connection.beginTransaction(); // Start Transaction

    // 1. Fetch bidder_info record
    const [bidderRows] =
      /** @type {import('mysql2/promise').RowDataPacket[][]} */ (
        await connection.execute(
          "SELECT id FROM bidder_info WHERE user_id = ? LIMIT 1",
          [userId],
        )
      );

    if (!bidderRows || bidderRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message:
          "Bidder profile not found. Please complete your registration details.",
      });
    }

    const bidderInfoId = bidderRows[0].id;

    // 2. Fetch auction details (status, ceiling_delta, revision_budget)
    const [auctionRows] =
      /** @type {import('mysql2/promise').RowDataPacket[][]} */ (
        await connection.execute(
          "SELECT id, status, ceiling_delta, revision_budget, created_at FROM auctions WHERE id = ? LIMIT 1",
          [auctionId],
        )
      );

    if (!auctionRows || auctionRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Auction not found.",
      });
    }

    const auction = auctionRows[0];
    if (String(auction.status).toUpperCase() !== "PENDING") {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Registration is only allowed for PENDING auctions.",
      });
    }

    // 3. Check if bidder is ALREADY registered for this auction
    const [existingRegs] =
      /** @type {import('mysql2/promise').RowDataPacket[][]} */ (
        await connection.execute(
          "SELECT id FROM auction_registrations WHERE auction_id = ? AND bidder_id = ? LIMIT 1",
          [auctionId, bidderInfoId],
        )
      );

    if (existingRegs && existingRegs.length > 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "You are already registered for this auction.",
      });
    }

    // 4. Insert new registration record using revision_budget as initial bids_left
    const initialBidsLeft = Number(auction.revision_budget) || 0;

    const insertRegQuery = `
      INSERT INTO auction_registrations (
        auction_id, 
        bidder_id, 
        registration_status, 
        bids_left, 
        registered_at
      )
      VALUES (?, ?, TRUE, ?, NOW())
    `;

    await connection.execute(insertRegQuery, [
      auctionId,
      bidderInfoId,
      initialBidsLeft,
    ]);

    // 5. Automatically place initial bid at the auction's ceiling_delta using auction.created_at
    const ceilingValue = Number(auction.ceiling_delta);

    const insertBidQuery = `
  INSERT INTO bids (auction_id, bidder_id, bid_value, bid_time) 
  VALUES (?, ?, ?, ?)
`;

    await connection.execute(insertBidQuery, [
      auctionId,
      bidderInfoId,
      ceilingValue,
      auction.created_at, // Uses created_at from the auction object
    ]);

    // Commit both registration and ceiling bid together
    await connection.commit();

    return res.status(200).json({
      success: true,
      message:
        "Successfully registered for the auction. Initial baseline bid set to ceiling value.",
      baseline_bid: ceilingValue,
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error registering for auction:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while registering for auction.",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  } finally {
    if (connection) connection.release();
  }
};

/**
 * @desc    Get detailed auction & bidding info for placing a bid
 * @route   GET /api/bidder/auctions/:id/bid-details
 * @access  Private (Bidder)
 */
export const getAuctionBidDetails = async (req, res) => {
  let connection = null;

  try {
    const userId = req.user?.id;
    const { id: auctionId } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    connection = await db.getConnection();

    // 1. Get Bidder Info & Daytime Tariff Details
    const bidderQuery = `
      SELECT 
        b.id AS bidder_id,
        b.user_id,
        b.dl_reference_id,
        b.cleared_inverter_rating_kw,
        b.clearance_date,
        b.term_days,
        t.scheme,
        t.daytime_fit_basis,
        t.daytime_fit_lkr_kwh,
        t.daytime_fit2_lkr_kwh,
        t.fit_step_date
      FROM bidder_info b
      LEFT JOIN daytime_tariff_details t ON b.dl_reference_id = t.dl_reference_id
      WHERE b.user_id = ?
      LIMIT 1
    `;
    const [bidderRows] = await connection.execute(bidderQuery, [userId]);

    if (!bidderRows || bidderRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Bidder profile not found.",
      });
    }

    const bidder = bidderRows[0];

    // 2. Fetch Auction Details
    const auctionQuery = `
      SELECT 
        id,
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
        quarter,
        year,
        status
      FROM auctions
      WHERE id = ?
      LIMIT 1
    `;
    const [auctionRows] = await connection.execute(auctionQuery, [auctionId]);

    if (!auctionRows || auctionRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Auction not found.",
      });
    }

    const auction = auctionRows[0];

    // Check if auction is OPEN
    const isAuctionOpen = String(auction.status).toUpperCase() === "OPEN";

    // 3. Fetch Registration Details
    const regQuery = `
      SELECT id, registration_status, bids_left
      FROM auction_registrations
      WHERE auction_id = ? AND bidder_id = ?
      LIMIT 1
    `;
    const [regRows] = await connection.execute(regQuery, [
      auctionId,
      bidder.bidder_id,
    ]);

    const registration = regRows && regRows.length > 0 ? regRows[0] : null;
    const isRegistered =
      registration && Boolean(registration.registration_status);

    if (!isAuctionOpen || !isRegistered) {
      return res.status(200).json({
        success: true,
        canBid: false,
        message: !isAuctionOpen
          ? "Auction is not open for bidding."
          : "You are not registered for this auction.",
        auction,
        isRegistered,
      });
    }

    // 4. Get Previous Bids for this bidder and auction
    const bidsQuery = `
      SELECT id, bid_value, bid_status, created_at
      FROM bids
      WHERE auction_id = ? AND bidder_id = ?
      ORDER BY created_at DESC
    `;
    const [bidRows] = await connection.execute(bidsQuery, [
      auctionId,
      bidder.bidder_id,
    ]);

    // Get the lowest bid and its status directly
    const lowestBidQuery = `
  SELECT bid_value, bid_status
  FROM bids
  WHERE auction_id = ? AND bidder_id = ?
  ORDER BY bid_value ASC, created_at DESC
  LIMIT 1
`;

    const [lowestBidRows] = await connection.execute(lowestBidQuery, [
      auctionId,
      bidder.bidder_id,
    ]);

    const currentBidArray =
      lowestBidRows.length > 0
        ? {
            value: Number(lowestBidRows[0].bid_value),
            status: lowestBidRows[0].bid_status,
          }
        : null;

    // Current bid = lowest bid value submitted by this bidder
    let currentBid = currentBidArray.value;
    let currentBidStatus = currentBidArray.status;

    // Calculate Contract End Date
    let contractEndDate = null;
    if (bidder.clearance_date && bidder.term_days) {
      const cDate = new Date(bidder.clearance_date);
      cDate.setDate(cDate.getDate() + Number(bidder.term_days));
      contractEndDate = cDate.toISOString().split("T")[0];
    }

    // Return complete payload
    return res.status(200).json({
      success: true,
      canBid: true,
      auction: {
        ...auction,
        ceiling_delta: Number(auction.ceiling_delta),
        min_decrement: Number(auction.min_decrement),
        bid_precision: Number(auction.bid_precision),
        eta_ref: Number(auction.eta_ref),
        quarterly_cap_kw: Number(auction.quarterly_cap_kw),
      },
      bids_left: Number(registration.bids_left),
      current_bid: currentBid,
      current_bid_status: currentBidStatus,
      bidder_info: {
        bidder_id: bidder.bidder_id,
        dl_reference_id: bidder.dl_reference_id,
        clearance_date: bidder.clearance_date,
        term_days: bidder.term_days,
        contract_end_date: contractEndDate,
      },
      daytime_tariff_details: {
        scheme: bidder.scheme,
        daytime_fit_basis: bidder.daytime_fit_basis,
        daytime_fit_lkr_kwh: Number(bidder.daytime_fit_lkr_kwh || 0),
        daytime_fit2_lkr_kwh: Number(bidder.daytime_fit2_lkr_kwh || 0),
        fit_step_date: bidder.fit_step_date,
      },
      previous_bids: bidRows.map((b) => ({
        id: b.id,
        bid_value: Number(b.bid_value),
        created_at: b.created_at,
      })),
    });
  } catch (error) {
    console.error("Error fetching auction bid details:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error fetching auction bid details.",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  } finally {
    if (connection) connection.release();
  }
};

/**
 * @desc    Submit a new bid for an auction
 * @route   POST /api/bidder/auctions/:id/bid
 * @access  Private (Bidder)
 */
export const placeBid = async (req, res) => {
  let connection = null;

  try {
    const userId = req.user?.id;
    const { id: auctionId } = req.params;
    const { bid_value } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    const proposedBid = parseFloat(bid_value);
    if (isNaN(proposedBid) || proposedBid < 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid bid value provided.",
      });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    // 1. Get Bidder Info
    const [bidderRows] = await connection.execute(
      "SELECT id FROM bidder_info WHERE user_id = ? LIMIT 1",
      [userId],
    );

    if (!bidderRows || bidderRows.length === 0) {
      await connection.rollback();
      return res
        .status(404)
        .json({ success: false, message: "Bidder profile not found." });
    }

    const bidderId = bidderRows[0].id;

    // 2. Fetch Registration details & bids left
    const [regRows] = await connection.execute(
      `SELECT id, bids_left, registration_status 
       FROM auction_registrations 
       WHERE auction_id = ? AND bidder_id = ? FOR UPDATE`,
      [auctionId, bidderId],
    );

    if (!regRows || regRows.length === 0 || !regRows[0].registration_status) {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: "You are not registered for this auction.",
      });
    }

    const bidsLeft = Number(regRows[0].bids_left);
    if (bidsLeft <= 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "No bids left for this auction round.",
      });
    }

    // 3. Get Auction parameters
    const [auctionRows] = await connection.execute(
      `SELECT status, ceiling_delta, min_decrement, bid_precision 
       FROM auctions WHERE id = ? LIMIT 1`,
      [auctionId],
    );

    if (!auctionRows || auctionRows.length === 0) {
      await connection.rollback();
      return res
        .status(404)
        .json({ success: false, message: "Auction not found." });
    }

    const auction = auctionRows[0];
    if (String(auction.status).toUpperCase() !== "OPEN") {
      await connection.rollback();
      return res
        .status(400)
        .json({ success: false, message: "Auction is not open." });
    }

    const ceilingDelta = Number(auction.ceiling_delta);
    const minDecrement = Number(auction.min_decrement);
    const precision = Number(auction.bid_precision);

    // 4. Get previous lowest bid for this bidder/auction
    const [lowestBidRows] = await connection.execute(
      `SELECT MIN(bid_value) AS min_bid FROM bids WHERE auction_id = ? AND bidder_id = ?`,
      [auctionId, bidderId],
    );

    const prevLowest =
      lowestBidRows[0]?.min_bid !== null
        ? Number(lowestBidRows[0].min_bid)
        : null;
    const maxAllowedBid =
      prevLowest !== null
        ? prevLowest - minDecrement
        : ceilingDelta - minDecrement;

    if (proposedBid > maxAllowedBid) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Bid must be lower than or equal to ${maxAllowedBid.toFixed(precision)}.`,
      });
    }

    // Validate precision
    const factor = Math.pow(10, precision);
    const isPrecisionValid =
      Math.abs(proposedBid * factor - Math.round(proposedBid * factor)) < 1e-6;
    if (!isPrecisionValid) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Bid value exceeds allowed precision of ${precision} decimal places.`,
      });
    }

    // 5. Insert new bid
    await connection.execute(
      `INSERT INTO bids (auction_id, bidder_id, bid_value, bid_time) VALUES (?, ?, ?, NOW())`,
      [auctionId, bidderId, proposedBid],
    );

    // 6. Decrement bids_left
    await connection.execute(
      `UPDATE auction_registrations SET bids_left = bids_left - 1 WHERE id = ?`,
      [regRows[0].id],
    );

    // 7. Recalculate cutoff price and update bid statuses (IN / OUT)
    await recalculateAuctionCutoff(connection, auctionId);

    // Commit all changes atomically
    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Bid placed successfully and auction merit order updated!",
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error placing bid:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while placing bid.",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  } finally {
    if (connection) connection.release();
  }
};
