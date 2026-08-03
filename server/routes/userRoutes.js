import express from "express";
import {
  registerUser,
  validateUser,
  loginUser,
  getMe,
  logoutUser,
} from "../controllers/userController.js";
import { validateCreateUser } from "../middleware/validateUser.js";

const router = express.Router();

// Public auth endpoints
router.post("/login", loginUser);
router.post("/register", validateCreateUser, registerUser);
router.post("/validate", validateUser);

// Session status & destruction endpoints
router.get("/me", getMe);
router.post("/logout", logoutUser);

export default router;
