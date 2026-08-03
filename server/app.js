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

// Helper to normalize origins (removes trailing slashes)
const normalizeUrl = (url) => (url ? url.trim().replace(/\/+$/, "") : "");

const allowedOrigins = [
  "http://localhost:3000",
  normalizeUrl(process.env.FRONTEND_URL),
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or server-to-server)
    if (!origin) return callback(null, true);

    const normalizedOrigin = normalizeUrl(origin);

    if (allowedOrigins.includes(normalizedOrigin)) {
      callback(null, true);
    } else {
      console.error(
        `[CORS Blocked] Origin: ${origin} | Allowed:`,
        allowedOrigins,
      );
      callback(null, false);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

// 1. Apply CORS middleware to all routes
app.use(cors(corsOptions));

const PORT = process.env.PORT || 5000;

// Initialize MySQL session store
const MySQLStore = MySQLStoreFactory(session);
const sessionStore = new MySQLStore(
  {
    clearExpired: true, // Automatically remove expired sessions
    checkExpirationInterval: 900000, // Check every 15 minutes (in ms)
    expiration: 86400000, // 1 day session TTL (in ms)
    createDatabaseTable: true, // Automatically create 'sessions' table if missing
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

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true, // Required for cookies/sessions to cross origins
  }),
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
      httpOnly: true, // Prevents XSS client script access
      secure: process.env.NODE_ENV === "production", // false on localhost, true on HTTPS production
      sameSite: "lax",
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
