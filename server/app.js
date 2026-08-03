import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import session from "express-session";
import MySQLStoreFactory from "express-mysql-session";
import pool from "./config/db.js"; // MySQL connection pool
import userRoutes from "./routes/userRoutes.js";
import dlRoutes from "./routes/dl.js";
import bidderRoutes from "./routes/bidder.js";
import aaRoutes from "./routes/aa.js";

dotenv.config();

const app = express();

// Helper to normalize origins (removes whitespace and trailing slashes)
const normalizeUrl = (url) => (url ? url.trim().replace(/\/+$/, "") : "");

const allowedOrigins = [
  "http://localhost:3000",
  "https://bess-auction.vercel.app",
  normalizeUrl(process.env.FRONTEND_URL),
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (Postman, server-to-server, cURL)
    if (!origin) return callback(null, true);

    const normalizedOrigin = normalizeUrl(origin);

    // Match exact listed origins OR any Vercel preview deployment for this app
    const isAllowed =
      allowedOrigins.includes(normalizedOrigin) ||
      /^https:\/\/bess-auction.*\.vercel\.app$/.test(normalizedOrigin);

    if (isAllowed) {
      callback(null, true);
    } else {
      console.error(
        `[CORS Blocked] Origin: ${origin} | Allowed:`,
        allowedOrigins,
      );
      callback(new Error(`CORS policy does not allow access from ${origin}`));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

// 1. Single CORS Middleware Application
app.use(cors(corsOptions));

// 2. Trust Proxy (REQUIRED for Render / Vercel HTTPS cookies)
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

const PORT = process.env.PORT || 5000;

// Initialize MySQL session store
const MySQLStore = MySQLStoreFactory(session);
const sessionStore = new MySQLStore(
  {
    clearExpired: true,
    checkExpirationInterval: 900000, // 15 minutes
    expiration: 86400000, // 1 day
    createDatabaseTable: true,
    schema: {
      tableName: "sessions",
      columnNames: {
        session_id: "session_id",
        expires: "expires",
        data: "data",
      },
    },
  },
  pool,
);

app.use(express.json());

// Session Middleware Configuration
app.use(
  session({
    key: "session_cookie_name",
    secret: process.env.SESSION_SECRET || "super_secret_key_change_in_prod",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 1 day
      httpOnly: true,
      // Cross-site cookie requirements:
      secure: process.env.NODE_ENV === "production", // Must be true on HTTPS
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // Must be 'none' for cross-domain cookies
    },
  }),
);

// Logger middleware
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.originalUrl}`);
  next();
});

// Routes
app.use("/api/users", userRoutes);
app.use("/api/dl", dlRoutes);
app.use("/api/bidder", bidderRoutes);
app.use("/api/aa", aaRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date() });
});

// Root route
app.get("/", (req, res) => {
  res.json({ message: "API is running..." });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

export default app;
