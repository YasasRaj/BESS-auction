// server/config/db.js
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000, // 10 seconds timeout
  // SSL configuration (see note below for local vs production)
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
  allowPublicKeyRetrieval: true,
});

// Immediately test connection when server boots
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log("✅ Database pool connected successfully!");
    connection.release();
  } catch (err) {
    console.error("❌ Database connection failed during startup:");
    console.error(err.message);
  }
})();

export default pool;
