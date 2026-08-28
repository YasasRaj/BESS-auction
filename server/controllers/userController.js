import bcrypt from "bcryptjs";
import pool from "../config/db.js";

/**
 * @route   POST /api/users/login
 * @desc    Authenticate user & establish session
 */
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("=== LOGIN DEBUG ===");
    console.log("Email received:", email);
    console.log("Password received:", password ? "[PROVIDED]" : "[MISSING]");

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    console.log("Normalized email:", normalizedEmail);

    const [users] = await pool.query(
      `SELECT id, first_name, last_name, email, phone_number, password, type, validated 
       FROM users 
       WHERE email = ?`,
      [normalizedEmail],
    );

    console.log("Users found:", users.length);

    if (users.length === 0) {
      console.log("❌ USER NOT FOUND");
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const user = users[0];

    console.log("User ID:", user.id);
    console.log("User email from DB:", user.email);
    console.log("Password hash exists:", !!user.password);
    console.log("Password hash prefix:", user.password?.substring(0, 10));

    const isMatch = await bcrypt.compare(password, user.password);

    console.log("Password match:", isMatch);

    if (!isMatch) {
      console.log("❌ PASSWORD DOES NOT MATCH");
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    console.log("✅ LOGIN SUCCESS");

    const userData = {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      phoneNumber: user.phone_number,
      type: user.type,
      validated: Boolean(user.validated),
    };

    req.session.user = userData;

    return res.status(200).json({
      message: "Login successful.",
      user: userData,
    });
  } catch (error) {
    console.error("Error in loginUser controller:", error);

    return res.status(500).json({
      message: error.message || "Failed to log in user.",
    });
  }
};

/**
 * @route   GET /api/users/me
 * @desc    Get current session user profile
 */
export const getMe = async (req, res) => {
  console.log("========== GET ME ==========");
  console.log("Session ID:", req.sessionID);
  console.log("Session:", req.session);
  console.log("Cookie header:", req.headers.cookie);

  if (req.session?.user) {
    return res.status(200).json({
      user: req.session.user,
    });
  }

  return res.status(401).json({
    message: "Not authenticated.",
  });
};

/**
 * @route   POST /api/users/logout
 * @desc    Destroy session & clear session cookie
 */
export const logoutUser = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: "Could not log out." });
    }
    // Clear the session cookie
    res.clearCookie("session_cookie_name");

    // Redirect to the home page
    return res.redirect("/");
  });
};

/**
 * @route   POST /api/users/register
 * @desc    Create a new unvalidated bidder user account
 */
export const registerUser = async (req, res) => {
  try {
    const { firstName, lastName, email, phoneNumber, password } = req.body;

    // 1. Basic field validation
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        message: "First name, last name, email, and password are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 2. Check if user already exists
    const [existingUsers] = await pool.query(
      "SELECT id FROM users WHERE email = ?",
      [normalizedEmail],
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        message: "A user account with this email address already exists.",
      });
    }

    // 3. Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // 4. Insert user record (validated defaults to FALSE)
    const [result] = await pool.query(
      `INSERT INTO users (
        first_name, 
        last_name, 
        email, 
        phone_number, 
        password, 
        validated, 
        created_at
      ) VALUES (?, ?, ?, ?, ?, FALSE, NOW())`,
      [
        firstName,
        lastName,
        normalizedEmail,
        phoneNumber || null,
        hashedPassword,
      ],
    );

    return res.status(201).json({
      message: "Unvalidated user account created successfully.",
      userId: result.insertId,
    });
  } catch (error) {
    console.error("Error in registerUser controller:", error);
    return res.status(500).json({
      message: error.message || "Failed to create user account.",
    });
  }
};

/**
 * @route   POST /api/users/validate
 * @desc    Validate user account and update profile/facility details
 */
export const validateUser = async (req, res) => {
  try {
    const {
      email,
      mobileNumber,
      prosumerName,
      nic,
      dlReferenceId,
      clearedInverterRatingKw,
      clearanceDate,
      termDays,
      scheme,
      daytimeFitBasis,
      solarConnectionAgreementStartDate,
      daytimeFitLkrKwh,
      daytimeFit2LkrKwh,
      fitStepDate,
      fitEndDate,
    } = req.body;

    if (!email) {
      return res
        .status(400)
        .json({ message: "User email is required for validation." });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 1. Check if user exists
    const [users] = await pool.query("SELECT id FROM users WHERE email = ?", [
      normalizedEmail,
    ]);

    if (users.length === 0) {
      return res.status(404).json({ message: "User account not found." });
    }

    const userId = users[0].id;

    // 2. Mark user as validated and sync phone number if updated
    await pool.query(
      `UPDATE users 
       SET validated = TRUE,
           phone_number = COALESCE(?, phone_number),
           updated_at = NOW() 
       WHERE id = ?`,
      [mobileNumber || null, userId],
    );

    // Update user status in active session if currently logged in
    if (req.session && req.session.user && req.session.user.id === userId) {
      req.session.user.validated = true;
    }

    return res.status(200).json({
      message: "User account validated successfully.",
      userId,
    });
  } catch (error) {
    console.error("Error in validateUser controller:", error);
    return res.status(500).json({
      message: error.message || "Failed to update user validation status.",
    });
  }
};
