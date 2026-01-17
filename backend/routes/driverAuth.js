import express from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import Driver from "../models/driver.js";
import DriverEnrollment from "../models/driverEnrollment.js";
import DriverWallet from "../models/driverWallet.js";
import DriverWalletMessage from "../models/driverWalletMessage.js";
import DriverPlanSelection from "../models/driverPlanSelection.js";
import DeviceToken from "../models/deviceToken.js";
import Transaction from "../models/transaction.js";
import Ticket from "../models/ticket.js";
import Expense from "../models/expense.js";
import Notification from "../models/notification.js";
import { authenticateToken } from "./middleware.js";

dotenv.config();

const router = express.Router();
const SECRET = process.env.JWT_SECRET || "dev_secret";

// Signup (username/password)
router.post("/signup", async (req, res) => {
  try {
    const { username, mobile, password } = req.body;
    if (!username || !mobile || !password) {
      return res
        .status(400)
        .json({ message: "Username, mobile and password required." });
    }

    // Check for duplicate username in Driver collection
    const existingUsername = await Driver.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({ message: "Username already exists." });
    }

    // Check for duplicate mobile in Driver collection
    const existingMobile = await Driver.findOne({ mobile });
    if (existingMobile) {
      return res
        .status(400)
        .json({ message: "Mobile number already registered." });
    }

    // Create new driver signup (password stored in plain text)
    const driverSignup = new Driver({
      username,
      mobile,
      password,
      status: "pending",
      kycStatus: "pending",
    });
    await driverSignup.save();

    // Emit notification for new driver signup (admin notification only, no pending approval message yet)
    try {
      const { createAndEmitNotification } = await import("../lib/notify.js");
      // Create notification visible to all admins (no recipientType/recipientId)
      await createAndEmitNotification({
        type: "driver_signup",
        title: `New driver signed up: ${username || mobile}`,
        message: `Driver ${
          username || mobile
        } has signed up. Please complete registration to proceed.`,
        data: {
          id: driverSignup._id,
          mobile: driverSignup.mobile,
          username: driverSignup.username,
        },
        recipientType: "admin",
        recipientId: null,
      });
    } catch (err) {
      console.warn("Notify failed:", err.message);
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: driverSignup._id,
        username: driverSignup.username,
        mobile: driverSignup.mobile,
        type: "driver",
      },
      SECRET,
      { expiresIn: "30d" }
    );

    return res.json({
      message: "Signup successful.",
      token,
      driver: {
        id: driverSignup._id,
        username: driverSignup.username,
        mobile: driverSignup.mobile,
        registrationCompleted: driverSignup.registrationCompleted || false,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({ message: "Server error during signup." });
  }
});

// Login (username/password)
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username and password required." });
    }

    // Find driver by username in Driver collection
    const driver = await Driver.findOne({ username });
    if (!driver) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    // Verify password (plain text comparison)
    if (driver.password !== password) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: driver._id,
        username: driver.username,
        mobile: driver.mobile,
        type: "driver",
      },
      SECRET,
      { expiresIn: "30d" }
    );

    return res.json({
      message: "Login successful.",
      token,
      driver: {
        id: driver._id,
        username: driver.username,
        mobile: driver.mobile,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Server error during login." });
  }
});

// Signup/login with OTP (OTP must match password)
router.post("/signup-otp", async (req, res) => {
  try {
    const { mobile, otp, username } = req.body;
    if (!mobile || !otp) {
      return res.status(400).json({ message: "Mobile and OTP required." });
    }

    // Check for duplicate mobile in Driver collection
    const existingMobile = await Driver.findOne({ mobile });
    if (existingMobile) {
      return res
        .status(400)
        .json({ message: "Mobile number already registered." });
    }

    // Create new driver signup with OTP as password (plain text)
    const driverSignup = new Driver({
      username: username || undefined,
      mobile,
      password: otp,
      status: "pending",
      kycStatus: "pending",
    });
    await driverSignup.save();

    // Emit notification for new driver signup (admin notification only, no pending approval message yet)
    try {
      const { createAndEmitNotification } = await import("../lib/notify.js");
      // Create notification visible to all admins (no recipientType/recipientId)
      await createAndEmitNotification({
        type: "driver_signup",
        title: `New driver signed up: ${username || mobile}`,
        message: `Driver ${
          username || mobile
        } has signed up via OTP. Please complete registration to proceed.`,
        data: {
          id: driverSignup._id,
          mobile: driverSignup.mobile,
          username: driverSignup.username,
        },
        recipientType: "admin",
        recipientId: null,
      });
    } catch (err) {
      console.warn("Notify failed:", err.message);
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: driverSignup._id,
        username: driverSignup.username,
        mobile: driverSignup.mobile,
        type: "driver",
      },
      SECRET,
      { expiresIn: "30d" }
    );

    return res.json({
      message: "Signup successful.",
      token,
      driver: {
        id: driverSignup._id,
        username: driverSignup.username,
        mobile: driverSignup.mobile,
        registrationCompleted: driverSignup.registrationCompleted || false,
      },
    });
  } catch (error) {
    console.error("Signup OTP error:", error);
    return res.status(500).json({ message: "Server error during signup." });
  }
});

router.post("/login-otp", async (req, res) => {
  try {
    const { mobile, username, otp } = req.body;
    
    // Either mobile or username must be provided along with otp
    if ((!mobile && !username) || !otp) {
      return res.status(400).json({ message: "Mobile or username and OTP required." });
    }

    // Find driver by mobile or username
    let driver;
    if (mobile) {
      driver = await Driver.findOne({ mobile });
      if (!driver) {
        return res.status(401).json({ message: "Invalid mobile number or OTP." });
      }
    } else if (username) {
      driver = await Driver.findOne({ username });
      if (!driver) {
        return res.status(401).json({ message: "Invalid username or OTP." });
      }
    }

    // Verify OTP matches the password stored during signup (plain text comparison)
    if (driver.password !== otp) {
      return res.status(401).json({ message: "Invalid OTP." });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: driver._id,
        username: driver.username,
        mobile: driver.mobile,
        type: "driver",
      },
      SECRET,
      { expiresIn: "30d" }
    );

    return res.json({
      message: "Login successful.",
      token,
      driver: {
        id: driver._id,
        username: driver.username,
        mobile: driver.mobile,
        registrationCompleted: driver.registrationCompleted || false,
      },
    });
  } catch (error) {
    console.error("Login OTP error:", error);
    return res.status(500).json({ message: "Server error during login." });
  }
});

// Forgot Password - Update password using mobile number
router.post("/forgot-password", async (req, res) => {
  try {
    const { mobile, newPassword } = req.body;

    // Validate input
    if (!mobile || !newPassword) {
      return res
        .status(400)
        .json({ message: "Mobile number and new password required." });
    }

    // Find driver by mobile number
    const driver = await Driver.findOne({ mobile });
    if (!driver) {
      return res
        .status(404)
        .json({ message: "Driver not found with this mobile number." });
    }

    // Update password (plain text)
    driver.password = newPassword;
    await driver.save();

    return res.json({
      message: "Password updated successfully.",
      driver: {
        id: driver._id,
        username: driver.username,
        mobile: driver.mobile,
      },
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return res
      .status(500)
      .json({ message: "Server error during password reset." });
  }
});

// Delete own account (driver) — authenticated route
router.delete("/delete-account", authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const id = user && user.id;
    if (!id)
      return res.status(401).json({ message: "Authentication required." });

    const deleted = await Driver.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "Driver account not found." });
    }

    // Cascade delete all related driver data
    const driverId = deleted._id.toString();
    const driverMobile = deleted.mobile;
    
    // Delete enrollments
    await DriverEnrollment.deleteMany({ driverId });
    // Delete wallet records
    await DriverWallet.deleteMany({ phone: driverMobile });
    // Delete wallet messages
    await DriverWalletMessage.deleteMany({ phone: driverMobile });
    // Delete plan selections
    await DriverPlanSelection.deleteMany({ driverId });
    // Delete device tokens
    await DeviceToken.deleteMany({ userId: driverId, userType: 'driver' });
    // Delete transactions
    await Transaction.deleteMany({ $or: [{ driverId }, { driverId: deleted.id }] });
    // Delete tickets
    await Ticket.deleteMany({ driverId: deleted.id });
    // Delete expenses
    await Expense.deleteMany({ $or: [{ driverId }, { driverId: deleted.id }] });
    // Delete notifications
    await Notification.deleteMany({ recipientId: driverId, recipientType: 'driver' });

    // Note: with stateless JWT tokens it's not possible to revoke issued tokens here.
    return res.json({
      message:
        "Account deleted. You will need to sign up again to use the app.",
    });
  } catch (error) {
    console.error("Delete account error:", error);
    return res
      .status(500)
      .json({ message: "Server error during account deletion." });
  }
});

export default router;
