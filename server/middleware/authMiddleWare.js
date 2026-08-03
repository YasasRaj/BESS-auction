// middleware/authMiddleware.js

/**
 * Verifies that the user has an active session
 */
export const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    // Attach session user to req.user for convenient access in controllers
    req.user = req.session.user;
    return next();
  }

  return res
    .status(401)
    .json({ message: "Authentication required. Please log in." });
};

/**
 * Restricts access to specific roles (case-insensitive)
 * Usage: authorizeRoles("Auction Admin", "Award Officer") or authorizeRoles("Bidder")
 */
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const rawUserRole = req.session.user.role || req.session.user.type || "";
    const userRole = String(rawUserRole).trim().toLowerCase();

    // Convert allowed roles list to lowercase for flexible matching
    const normalizedAllowedRoles = allowedRoles.map((role) =>
      String(role).trim().toLowerCase(),
    );

    if (!normalizedAllowedRoles.includes(userRole)) {
      console.warn(
        `⛔ [403 Forbidden] User ID ${req.session.user.id} with role "${rawUserRole}" attempted to access route requiring: [${allowedRoles.join(
          ", ",
        )}]`,
      );

      return res.status(403).json({
        message: `Access forbidden. Requires one of: ${allowedRoles.join(", ")}`,
      });
    }

    // Attach session user to req.user if not already attached
    req.user = req.session.user;
    next();
  };
};
