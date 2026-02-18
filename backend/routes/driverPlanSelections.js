// ...existing code...

// PATCH: Update extraAmount and extraReason (Admin endpoint)

import express from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import DriverPlanSelection from "../models/driverPlanSelection.js";
import Driver from "../models/driver.js";
import mongoose from "mongoose";

dotenv.config();

const router = express.Router();
const SECRET = process.env.JWT_SECRET || "dev_secret";

// Helper function to calculate payment details
function calculatePaymentDetails(selection) {
  // Calculate days (inclusive)
  let days = 0;

  // Prefer explicit rentStartDate when present
  let effectiveStart = selection.rentStartDate
    ? new Date(selection.rentStartDate)
    : null;

  // Fallback: if no rentStartDate but plan is active and a vehicle
  // is already linked, treat the selection date as start of rent.
  // This ensures "days" starts once a vehicle is assigned, even if
  // rentStartDate wasn't persisted for some reason.
  if (!effectiveStart && selection.status === "active" && selection.vehicleId) {
    if (selection.selectedDate) {
      effectiveStart = new Date(selection.selectedDate);
    } else if (selection.createdAt) {
      effectiveStart = new Date(selection.createdAt);
    }
  }

  if (effectiveStart) {
    let end = new Date();
    if (selection.status === "inactive" && selection.rentPausedDate) {
      end = new Date(selection.rentPausedDate);
    }
    // Normalize to midnight for both dates
    const startMidnight = new Date(
      effectiveStart.getFullYear(),
      effectiveStart.getMonth(),
      effectiveStart.getDate()
    );
    const endMidnight = new Date(
      end.getFullYear(),
      end.getMonth(),
      end.getDate()
    );
    days =
      Math.floor((endMidnight - startMidnight) / (1000 * 60 * 60 * 24)) + 1;
    days = Math.max(1, days);
  }

  // Rent per day/week
  const rentPerDay =
    selection.calculatedRent ||
    (() => {
      const slab = selection.selectedRentSlab || {};
      return selection.planType === "weekly"
        ? slab.weeklyRent || 0
        : slab.rentDay || 0;
    })();

  // Adjustment amount
  const adjustment = selection.adjustmentAmount || 0;

  // Total amounts
  const totalDeposit = selection.securityDeposit || 0;
  const totalRent = days * rentPerDay;

  // Get total payments made (from both driver and admin)
  // Use tracked depositPaid and rentPaid if available, otherwise fallback to legacy logic
  let totalDepositPaid = selection.depositPaid || 0;
  let totalRentPaid = selection.rentPaid || 0;

  // Legacy fallback: if depositPaid/rentPaid not tracked, use old logic
  if (totalDepositPaid === 0 && totalRentPaid === 0) {
    const driverPaid = selection.paidAmount || 0;
    const adminPaid = selection.adminPaidAmount || 0;
    const totalPaid = driverPaid + adminPaid;

    if (selection.paymentType === "security") {
      totalDepositPaid = totalPaid;
    } else if (selection.paymentType === "rent") {
      totalRentPaid = totalPaid;
    }
  }

  // Calculate what's still due
  const depositDue = Math.max(0, totalDeposit - totalDepositPaid);
  const rentDue = Math.max(0, totalRent - totalRentPaid - adjustment);

  // Extra amount and accidental cover
  const extraAmount = selection.extraAmount || 0;
  const extraAmountPaid = selection.extraAmountPaid || 0;
  const extraAmountDue = Math.max(0, extraAmount - extraAmountPaid);

  const accidentalCover =
    selection.planType === "weekly"
      ? selection.calculatedCover ||
        selection.selectedRentSlab?.accidentalCover ||
        105
      : 0;
  const accidentalCoverPaid = selection.accidentalCoverPaid || 0;
  const accidentalCoverDue = Math.max(0, accidentalCover - accidentalCoverPaid);

  // Total paid amount (driver + admin)
  const paidAmount =
    (selection.paidAmount || 0) + (selection.adminPaidAmount || 0);

  // Total payable = deposit due + rent due (already adjusted) + accidental cover due + extra amount due
  const totalPayable = Math.max(
    0,
    depositDue + rentDue + accidentalCoverDue + extraAmountDue
  );

  return {
    days,
    rentPerDay,
    totalRent,
    accidentalCover,
    accidentalCoverDue,
    depositDue,
    rentDue,
    extraAmount,
    extraAmountDue,
    adjustment,
    paidAmount,
    totalDepositPaid,
    totalRentPaid,
    extraAmountPaid,
    accidentalCoverPaid,
    totalPayable,
  };
}

router.patch("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid plan selection ID" });
    }
    const {
      extraAmount,
      extraReason,
      adjustmentAmount,
      adjustmentReason,
      adminPaidAmount,
      adminPaymentType,
      paymentStatus,
    } = req.body;
    const selection = await DriverPlanSelection.findById(id);
    if (!selection) {
      return res.status(404).json({ message: "Plan selection not found" });
    }

    // Handle payment status change (admin only)
    if (paymentStatus && ['pending', 'completed', 'failed'].includes(paymentStatus)) {
      selection.paymentStatus = paymentStatus;
      if (paymentStatus === 'completed') {
        selection.paymentDate = new Date();
      }
    }

    // Handle extra amount - add to cumulative total and push to array
    if (typeof extraAmount !== "undefined") {
      selection.extraAmount = (selection.extraAmount || 0) + extraAmount;
      if (!selection.extraAmounts) selection.extraAmounts = [];
      selection.extraAmounts.push({
        amount: extraAmount,
        reason: extraReason || "",
        date: new Date(),
      });
      // Update the legacy reason field
      if (extraReason) {
        selection.extraReason = extraReason;
      }
    }

    // Handle adjustment amount - add to cumulative total and push to array
    if (typeof adjustmentAmount !== "undefined") {
      const currentAdjustment = selection.adjustmentAmount || 0;
      selection.adjustmentAmount = currentAdjustment + adjustmentAmount;
      if (!selection.adjustments) selection.adjustments = [];
      selection.adjustments.push({
        amount: adjustmentAmount,
        reason: adjustmentReason || "",
        date: new Date(),
      });
      // Update the legacy reason field
      if (adjustmentReason) {
        selection.adjustmentReason = adjustmentReason;
      }
    }

    // Handle admin paid amount - track in adminPayments array
    if (typeof adminPaidAmount !== "undefined" && adminPaidAmount > 0) {
      const paymentAmount = Number(adminPaidAmount);
      const paymentType = adminPaymentType || "rent";

      // Initialize adminPayments array if it doesn't exist
      if (!selection.adminPayments) {
        selection.adminPayments = [];
      }

      // Calculate deposit, rent, extra amount, and accidental cover paid based on payment type
      let depositPaidNow = 0;
      let rentPaidNow = 0;
      let extraAmountPaidNow = 0;
      let accidentalCoverPaidNow = 0;

      if (paymentType === "security") {
        // Full amount goes to deposit
        depositPaidNow = paymentAmount;
      } else if (paymentType === "rent") {
        // Full amount goes to rent
        rentPaidNow = paymentAmount;
      } else if (paymentType === "total") {
        // Distribute amount based on what's due (priority: deposit > rent > accidental cover > extra amount)
        const paymentDetails = calculatePaymentDetails(selection);
        const depositDue = paymentDetails.depositDue || 0;
        const rentDue = paymentDetails.rentDue || 0;
        const accidentalCoverDue = Math.max(
          0,
          (paymentDetails.accidentalCover || 0) -
            (selection.accidentalCoverPaid || 0)
        );
        const extraAmountDue = Math.max(
          0,
          (selection.extraAmount || 0) - (selection.extraAmountPaid || 0)
        );

        let remainingPayment = paymentAmount;

        // 1. Pay deposit first
        if (depositDue > 0 && remainingPayment > 0) {
          depositPaidNow = Math.min(remainingPayment, depositDue);
          remainingPayment -= depositPaidNow;
        }

        // 2. Then pay rent
        if (rentDue > 0 && remainingPayment > 0) {
          rentPaidNow = Math.min(remainingPayment, rentDue);
          remainingPayment -= rentPaidNow;
        }

        // 3. Then pay accidental cover
        if (accidentalCoverDue > 0 && remainingPayment > 0) {
          accidentalCoverPaidNow = Math.min(
            remainingPayment,
            accidentalCoverDue
          );
          remainingPayment -= accidentalCoverPaidNow;
        }

        // 4. Finally pay extra amount
        if (extraAmountDue > 0 && remainingPayment > 0) {
          extraAmountPaidNow = Math.min(remainingPayment, extraAmountDue);
          remainingPayment -= extraAmountPaidNow;
        }
      }

      // Add to adminPayments array with details
      selection.adminPayments.push({
        date: new Date(),
        amount: paymentAmount,
        type: paymentType,
        depositPaid: depositPaidNow,
        rentPaid: rentPaidNow,
        extraAmountPaid: extraAmountPaidNow,
        accidentalCoverPaid: accidentalCoverPaidNow,
      });

      // Update cumulative totals
      selection.adminPaidAmount =
        (selection.adminPaidAmount || 0) + paymentAmount;
      selection.depositPaid = (selection.depositPaid || 0) + depositPaidNow;
      selection.rentPaid = (selection.rentPaid || 0) + rentPaidNow;
      selection.extraAmountPaid =
        (selection.extraAmountPaid || 0) + extraAmountPaidNow;
      selection.accidentalCoverPaid =
        (selection.accidentalCoverPaid || 0) + accidentalCoverPaidNow;

      // Set paymentDate when admin records payment (if not already set)
      if (!selection.paymentDate) {
        selection.paymentDate = new Date();
      }

      // Set paymentMode to 'cash' for admin recorded payments
      if (!selection.paymentMode || selection.paymentMode === '') {
        selection.paymentMode = 'cash';
      }

      console.log("Admin payment recorded:", {
        selectionId: selection._id,
        paymentAmount,
        paymentType,
        depositPaidNow,
        rentPaidNow,
        extraAmountPaidNow,
        accidentalCoverPaidNow,
        totalAdminPaid: selection.adminPaidAmount,
        totalDepositPaid: selection.depositPaid,
        totalRentPaid: selection.rentPaid,
        totalExtraAmountPaid: selection.extraAmountPaid,
        totalAccidentalCoverPaid: selection.accidentalCoverPaid,
        paymentMode: selection.paymentMode,
      });
    }

    await selection.save();

    // Calculate and return updated payment details
    const updatedPaymentDetails = calculatePaymentDetails(selection);

    res.json({
      message: "Payment details updated successfully",
      selection: {
        ...selection.toObject(),
        paymentDetails: updatedPaymentDetails,
      },
    });
  } catch (err) {
    console.error("PATCH /driver-plan-selections/:id error:", err);
    res.status(500).json({ message: "Failed to update payment details" });
  }
});
// Get all driver payments for drivers managed by a specific manager
import Vehicle from "../models/vehicle.js";
router.get("/by-manager/:manager", async (req, res) => {
  try {
    const managerParam = req.params.manager?.trim();
    console.log("Get payments by manager - manager param:", managerParam);

    if (!managerParam) {
      return res.json([]);
    }

    // Build query for vehicles - manager can be ObjectId, email, name or username
    let managerIdentifiers = [managerParam];
    const Manager = (await import("../models/manager.js")).default;

    // If param looks like ObjectId, try to fetch manager by ID
    if (mongoose.Types.ObjectId.isValid(managerParam)) {
      const mgrDoc = await Manager.findById(managerParam).lean();
      if (mgrDoc) {
        console.log("Manager found by ID:", mgrDoc.name || mgrDoc.username);
        if (mgrDoc.name) managerIdentifiers.push(mgrDoc.name.trim());
        if (mgrDoc.username) managerIdentifiers.push(mgrDoc.username.trim());
        if (mgrDoc.email) managerIdentifiers.push(mgrDoc.email.trim());
      } else {
        console.log("Manager not found for ObjectId:", managerParam);
      }
    }
    // If param looks like email, try to fetch manager by email
    else if (managerParam.includes("@")) {
      const mgrDoc = await Manager.findOne({ email: managerParam }).lean();
      if (mgrDoc) {
        console.log("Manager found by email:", mgrDoc.name || mgrDoc.username);
        if (mgrDoc._id) managerIdentifiers.push(mgrDoc._id.toString());
        if (mgrDoc.name) managerIdentifiers.push(mgrDoc.name.trim());
        if (mgrDoc.username) managerIdentifiers.push(mgrDoc.username.trim());
      } else {
        console.log("Manager not found for email:", managerParam);
      }
    }

    // Build query to match manager by ObjectId or name/username
    // Try multiple formats since assignedManager is a String field
    const vehicleQuery = {
      $or: [
        { assignedManager: managerParam }, // Direct ObjectId string match
        { assignedManager: managerParam.toString() }, // Ensure it's a string
        {
          assignedManager: {
            $in: managerIdentifiers.map((id) => new RegExp(`^${id}$`, "i")),
          },
        }, // Name/username match
      ],
    };

    console.log("Vehicle query:", JSON.stringify(vehicleQuery, null, 2));
    console.log("Manager identifiers to search:", managerIdentifiers);

    // Find all vehicles assigned to this manager
    const vehicles = await Vehicle.find(vehicleQuery).lean();
    console.log(`Found ${vehicles.length} vehicles for manager`);

    // Debug: log sample vehicles to see their structure
    if (vehicles.length > 0) {
      console.log("Sample vehicle:", {
        vehicleId: vehicles[0].vehicleId,
        assignedManager: vehicles[0].assignedManager,
        assignedDriver: vehicles[0].assignedDriver,
        managerType: typeof vehicles[0].assignedManager,
        driverType: typeof vehicles[0].assignedDriver,
      });
    }

    if (vehicles.length === 0) {
      console.log("No vehicles found for manager, returning empty array");
      // Try a simpler query to see if any vehicles exist with this manager in any format
      const allVehicles = await Vehicle.find({
        assignedManager: { $exists: true, $ne: "" },
      })
        .limit(5)
        .lean();
      console.log(
        "Sample vehicles with managers:",
        allVehicles.map((v) => ({
          vehicleId: v.vehicleId,
          assignedManager: v.assignedManager,
          managerType: typeof v.assignedManager,
        }))
      );
      return res.json([]);
    }

    // Collect all assigned driver IDs (could be ObjectId strings or usernames/mobiles)
    const assignedDriverIds = vehicles
      .map((v) => v.assignedDriver)
      .filter(Boolean)
      .map((id) => id.toString().trim());

    console.log("Assigned driver IDs from vehicles:", assignedDriverIds);
    console.log(
      "Total vehicles with drivers:",
      assignedDriverIds.length,
      "out of",
      vehicles.length
    );

    if (assignedDriverIds.length === 0) {
      console.log(
        "No assigned drivers found in vehicles, returning empty array"
      );
      return res.json([]);
    }

    // Convert valid ObjectIds to mongoose ObjectIds
    const validObjectIds = assignedDriverIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    console.log("Valid ObjectIds:", validObjectIds.length);

    // First, look up Driver documents (vehicles reference Driver collection)
    const drivers =
      validObjectIds.length > 0
        ? await Driver.find({ _id: { $in: validObjectIds } }).lean()
        : [];

    console.log(`Found ${drivers.length} drivers from Driver collection`);

    // Extract mobile numbers and usernames from Driver documents
    const driverMobiles = drivers.map((d) => d.mobile).filter(Boolean);
    const driverUsernames = drivers.map((d) => d.username).filter(Boolean);
    const driverPhones = drivers.map((d) => d.phone).filter(Boolean);

    console.log("Driver mobiles from Driver collection:", driverMobiles);
    console.log("Driver usernames from Driver collection:", driverUsernames);

    // Collect all identifiers from the drivers already found
    const driverSignupIds = drivers.map((d) => d._id);
    const signupUsernames = drivers
      .map((d) => d.username)
      .filter(Boolean);
    const signupMobiles = drivers.map((d) => d.mobile).filter(Boolean);

    console.log("DriverSignup IDs:", driverSignupIds);
    console.log("DriverSignup usernames:", signupUsernames);
    console.log("DriverSignup mobiles:", signupMobiles);

    // Combine all identifiers for payment matching
    const allUsernames = [
      ...new Set([
        ...signupUsernames,
        ...driverUsernames,
        ...assignedDriverIds.filter(
          (id) => !mongoose.Types.ObjectId.isValid(id)
        ),
      ]),
    ];
    const allMobiles = [
      ...new Set([
        ...signupMobiles,
        ...driverMobiles,
        ...driverPhones,
        ...assignedDriverIds.filter(
          (id) => !mongoose.Types.ObjectId.isValid(id)
        ),
      ]),
    ];

    // Build query to find payments
    const paymentQuery = {
      $or: [],
    };

    // Match by driverId (most reliable)
    if (driverSignupIds.length > 0) {
      paymentQuery.$or.push({ driverId: { $in: driverSignupIds } });
    }

    // Match by username (case-insensitive)
    if (allUsernames.length > 0) {
      paymentQuery.$or.push({
        driverUsername: {
          $in: allUsernames.map((u) => new RegExp(`^${u}$`, "i")),
        },
      });
    }

    // Match by mobile
    if (allMobiles.length > 0) {
      paymentQuery.$or.push({
        driverMobile: { $in: allMobiles.map((m) => new RegExp(`^${m}$`, "i")) },
      });
    }

    console.log("Payment query:", JSON.stringify(paymentQuery, null, 2));

    if (paymentQuery.$or.length === 0) {
      console.log("No payment query conditions, returning empty array");
      return res.json([]);
    }

    // Find all driver payments for these drivers
    const payments = await DriverPlanSelection.find(paymentQuery).lean();

    console.log(`Found ${payments.length} payments for manager`);

    // Fetch vehicle data for each payment
    const vehicleIds = [
      ...new Set(payments.map((p) => p.vehicleId).filter(Boolean)),
    ];
    const vehiclesForPayments = await Vehicle.find({
      vehicleId: { $in: vehicleIds },
    }).lean();
    const vehicleMap = {};
    vehiclesForPayments.forEach((v) => {
      vehicleMap[v.vehicleId] = v;
    });

    // Add calculated payment details and vehicle info to each payment
    const paymentsWithDetails = payments.map((p) => {
      const vehicle = p.vehicleId ? vehicleMap[p.vehicleId] : null;
      return {
        ...p,
        paymentDetails: calculatePaymentDetails(p),
        vehicleStatus: vehicle?.status || null,
        vehicleRegistrationNumber: vehicle?.registrationNumber || null,
      };
    });

    res.json(paymentsWithDetails);
  } catch (err) {
    console.error("Get payments by manager error:", err);
    res
      .status(500)
      .json({
        message: "Failed to load payments for manager",
        error: err.message,
      });
  }
});

// Search driver plan selections with server-side filtering
router.get("/search", async (req, res) => {
  try {
    const term = (req.query.term || "").trim();
    const status = req.query.status || "all";
    const mode = req.query.mode || "all";
    const from = req.query.from || null;
    const to = req.query.to || null;
    const managerParam = req.query.manager?.trim();

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const requestedLimit = parseInt(req.query.limit) || 50;
    const MIN_LIMIT = 5;
    const MAX_LIMIT = 200;
    const limit = Math.min(Math.max(requestedLimit, MIN_LIMIT), MAX_LIMIT);
    const skip = (page - 1) * limit;

    const sortBy = req.query.sortBy || "selectedDate";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

    const paymentQuery = { $and: [] };

    // Term search across driverUsername, driverMobile, planName
    if (term) {
      const safe = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(safe, "i");
      paymentQuery.$and.push({
        $or: [
          { driverUsername: re },
          { driverMobile: re },
          { planName: re },
        ],
      });
    }

    if (mode && mode !== "all") {
      paymentQuery.$and.push({ paymentMode: mode });
    }

    if (status && status !== "all" && status !== "unpaid") {
      paymentQuery.$and.push({ paymentStatus: status });
    }

    if (from || to) {
      const dateQuery = {};
      if (from) dateQuery.$gte = new Date(from);
      if (to) {
        const d = new Date(to);
        d.setHours(23, 59, 59, 999);
        dateQuery.$lte = d;
      }
      paymentQuery.$and.push({ paymentDate: dateQuery });
    }

    // If manager filter provided, narrow down by drivers assigned to manager (re-use logic)
    if (managerParam) {
      const Manager = (await import("../models/manager.js")).default;
      let managerIdentifiers = [managerParam];
      if (mongoose.Types.ObjectId.isValid(managerParam)) {
        const mgrDoc = await Manager.findById(managerParam).lean();
        if (mgrDoc) {
          if (mgrDoc.name) managerIdentifiers.push(mgrDoc.name.trim());
          if (mgrDoc.username) managerIdentifiers.push(mgrDoc.username.trim());
          if (mgrDoc.email) managerIdentifiers.push(mgrDoc.email.trim());
        }
      } else if (managerParam.includes("@")) {
        const mgrDoc = await Manager.findOne({ email: managerParam }).lean();
        if (mgrDoc) {
          if (mgrDoc._id) managerIdentifiers.push(mgrDoc._id.toString());
          if (mgrDoc.name) managerIdentifiers.push(mgrDoc.name.trim());
          if (mgrDoc.username) managerIdentifiers.push(mgrDoc.username.trim());
        }
      }

      const vehicleQuery = {
        $or: [
          { assignedManager: managerParam },
          { assignedManager: managerParam.toString() },
          { assignedManager: { $in: managerIdentifiers.map((id) => new RegExp(`^${id}$`, "i")) } },
        ],
      };
      const vehicles = await Vehicle.find(vehicleQuery).lean();
      const assignedDriverIds = vehicles.map((v) => v.assignedDriver).filter(Boolean).map((id) => id.toString().trim());

      // If we have assigned drivers, match payments to those drivers/signup ids/usernames/mobiles
      if (assignedDriverIds.length > 0) {
        const validObjectIds = assignedDriverIds
          .filter((id) => mongoose.Types.ObjectId.isValid(id))
          .map((id) => new mongoose.Types.ObjectId(id));

        const drivers =
          validObjectIds.length > 0
            ? await Driver.find({ _id: { $in: validObjectIds } }).lean()
            : [];

        const driverMobiles = drivers.map((d) => d.mobile).filter(Boolean);
        const driverUsernames = drivers.map((d) => d.username).filter(Boolean);
        const driverPhones = drivers.map((d) => d.phone).filter(Boolean);

        const driverSignupQuery = { $or: [] };
        if (driverMobiles.length > 0) driverSignupQuery.$or.push({ mobile: { $in: driverMobiles } });
        if (driverUsernames.length > 0) driverSignupQuery.$or.push({ username: { $in: driverUsernames } });
        if (driverPhones.length > 0) driverSignupQuery.$or.push({ phone: { $in: driverPhones } });

        // All identifiers are already in driverSignupIds from the drivers we found
        const allUsernames = [
          ...new Set([
            ...driverUsernames,
            ...assignedDriverIds.filter((id) => !mongoose.Types.ObjectId.isValid(id)),
          ]),
        ];

        const allMobiles = [
          ...new Set([
            ...driverMobiles,
            ...driverPhones,
            ...assignedDriverIds.filter((id) => !mongoose.Types.ObjectId.isValid(id)),
          ]),
        ];

        const mgrConditions = { $or: [] };
        if (driverSignupIds.length > 0) mgrConditions.$or.push({ driverId: { $in: driverSignupIds } });
        if (allUsernames.length > 0) mgrConditions.$or.push({ driverUsername: { $in: allUsernames.map((u) => new RegExp(`^${u}$`, "i")) } });
        if (allMobiles.length > 0) mgrConditions.$or.push({ driverMobile: { $in: allMobiles.map((m) => new RegExp(`^${m}$`, "i")) } });

        if (mgrConditions.$or.length > 0) {
          paymentQuery.$and.push(mgrConditions);
        } else {
          // If no driver identifiers could be resolved, return empty
          return res.json({ data: [], pagination: { total: 0, page, limit, totalPages: 0 } });
        }
      } else {
        return res.json({ data: [], pagination: { total: 0, page, limit, totalPages: 0 } });
      }
    }

    const finalQuery = (paymentQuery.$and && paymentQuery.$and.length > 0) ? { $and: paymentQuery.$and } : {};

    const selections = await DriverPlanSelection.find(finalQuery)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean();

    // Compute payment details and optionally filter unpaid
    let selectionsWithDetails = selections.map((s) => ({ ...s, paymentDetails: calculatePaymentDetails(s) }));
    if (status === "unpaid") {
      selectionsWithDetails = selectionsWithDetails.filter((s) => (s.paymentDetails?.totalPayable || 0) > 0);
    }

    // Fetch vehicles to augment results
    const vehicleIds = [...new Set(selectionsWithDetails.map((s) => s.vehicleId).filter(Boolean))];
    const vehicles = await Vehicle.find({ vehicleId: { $in: vehicleIds } }).lean();
    const vehicleMap = {};
    vehicles.forEach((v) => { vehicleMap[v.vehicleId] = v; });

    const results = selectionsWithDetails.map((s) => ({
      ...s,
      vehicleStatus: s.vehicleId ? vehicleMap[s.vehicleId]?.status || null : null,
      vehicleRegistrationNumber: s.vehicleId ? vehicleMap[s.vehicleId]?.registrationNumber || null : null,
    }));

    const total = await DriverPlanSelection.countDocuments(finalQuery);

    res.json({ data: results, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error("Search driver plan selections error:", err);
    res.status(500).json({ message: "Failed to search plan selections", error: err.message });
  }
});
// Middleware to verify driver JWT token
const authenticateDriver = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Missing token" });
  }

  jwt.verify(token, SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Invalid token" });
    }
    req.driver = user;
    next();
  });
};

// Get all driver plan selections (Admin view)
router.get("/", async (req, res) => {
  try {
    // Enforce pagination - no unlimited option
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const requestedLimit = parseInt(req.query.limit) || 10;
    const MIN_LIMIT = 10;
    const MAX_LIMIT = 100;

    const limit = Math.min(Math.max(requestedLimit, MIN_LIMIT), MAX_LIMIT);
    const skip = (page - 1) * limit;

    const sortBy = req.query.sortBy || "selectedDate";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

    const total = await DriverPlanSelection.countDocuments();

    const selections = await DriverPlanSelection.find()
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean();

    // Fetch vehicle data for each selection
    const vehicleIds = [
      ...new Set(selections.map(s => s.vehicleId).filter(Boolean)),
    ];

    const vehicles = await Vehicle.find({
      vehicleId: { $in: vehicleIds },
    }).lean();

    const vehicleMap = {};
    vehicles.forEach(v => {
      vehicleMap[v.vehicleId] = v;
    });

    // Add calculated payment details and vehicle info
    const selectionsWithBreakdown = selections.map(s => {
      const paymentDetails = calculatePaymentDetails(s);
      const vehicle = s.vehicleId ? vehicleMap[s.vehicleId] : null;

      return {
        ...s,
        paymentDetails,
        vehicleStatus: vehicle?.status || null,
        vehicleRegistrationNumber: vehicle?.registrationNumber || null,
      };
    });

    res.json({
      data: selectionsWithBreakdown,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (err) {
    console.error("Get plan selections error:", err);
    res.status(500).json({ message: "Failed to load plan selections" });
  }
});


// Get all plan selections by driver mobile number
router.get("/by-mobile/:mobile", async (req, res) => {
  try {
    const mobile = req.params.mobile;
    const selections = await DriverPlanSelection.find({ driverMobile: mobile })
      .sort({ selectedDate: -1 })
      .lean();
    // Ensure each selection includes a `paymentDetails` object (compute if missing)
    const selectionsWithDetails = selections.map((s) => ({
      ...s,
      paymentDetails: s.paymentDetails || calculatePaymentDetails(s),
    }));

    res.json(selectionsWithDetails);
  } catch (err) {
    console.error("Get plans by mobile error:", err);
    res.status(500).json({ message: "Failed to load plans for this mobile" });
  }
});

// Get single plan selection by ID
router.get("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid plan selection ID" });
    }
    const selection = await DriverPlanSelection.findById(id).lean();
    if (!selection) {
      return res.status(404).json({ message: "Plan selection not found" });
    }
    // Calculation logic
    let days = 0;
    if (selection.rentStartDate) {
      const start = new Date(selection.rentStartDate);
      let end = new Date();
      if (selection.status === "inactive" && selection.rentPausedDate) {
        end = new Date(selection.rentPausedDate);
      }
      // Normalize to midnight for both dates
      const startMidnight = new Date(
        start.getFullYear(),
        start.getMonth(),
        start.getDate()
      );
      const endMidnight = new Date(
        end.getFullYear(),
        end.getMonth(),
        end.getDate()
      );
      days =
        Math.floor((endMidnight - startMidnight) / (1000 * 60 * 60 * 24)) + 1;
      days = Math.max(1, days);
    }
    const rentPerDay =
      selection.rentPerDay || selection.selectedRentSlab?.rentDay || 0 || 0;
    const accidentalCover =
      selection.planType === "weekly"
        ? selection.calculatedCover ||
          selection.selectedRentSlab?.accidentalCover ||
          105
        : 0;
    let depositDue = 0;
    if (selection.paymentType === "security") {
      depositDue = Math.max(
        0,
        (selection.securityDeposit || 0) - (selection.paidAmount || 0)
      );
    } else {
      depositDue = selection.securityDeposit || 0;
    }
    let rentDue = 0;
    if (selection.paymentType === "rent") {
      rentDue = Math.max(0, days * rentPerDay - (selection.paidAmount || 0));
    } else {
      rentDue = days * rentPerDay;
    }
    const extraAmount = selection.extraAmount || 0;
    const extraReason = selection.extraReason || "";
    const totalAmount = depositDue + rentDue + accidentalCover + extraAmount;
    let dailyRentSummary = null;
    if (selection.rentStartDate) {
      dailyRentSummary = {
        hasStarted: true,
        totalDays: days,
        rentPerDay,
        totalDue: rentDue,
        startDate: selection.rentStartDate,
      };
    }
    const response = {
      ...selection,
      paymentBreakdown: {
        securityDeposit: selection.securityDeposit || 0,
        rent: rentDue,
        rentType: selection.planType === "weekly" ? "weeklyRent" : "dailyRent",
        accidentalCover,
        extraAmount,
        extraReason,
        totalAmount,
      },
      dailyRentSummary,
    };
    res.json(response);
  } catch (err) {
    console.error("Get plan selection error:", err);
    res.status(500).json({ message: "Failed to load plan selection" });
  }
});
// Create new plan selection (Public - mobile only)
router.post("/public", async (req, res) => {
  try {
    const {
      planName,
      planType,
      securityDeposit,
      rentSlabs,
      selectedRentSlab,
      driverMobile,
      driverUsername,
    } = req.body;
    if (!planName || !planType) {
      return res
        .status(400)
        .json({ message: "Plan name and type are required" });
    }
    if (!driverMobile) {
      return res
        .status(400)
        .json({ message: "driverMobile is required when not authenticated" });
    }

    const mobile = driverMobile.toString().trim();

    // Try to find existing driver by mobile
    const driver = await Driver.findOne({ mobile });

    // Check if driver already has an active selection
    const existingSelection = driver
      ? await DriverPlanSelection.findOne({
          driverId: driver._id,
          status: "active",
        })
      : await DriverPlanSelection.findOne({
          driverMobile: mobile,
          status: "active",
        });

    if (existingSelection) {
      return res
        .status(400)
        .json({
          message:
            "Driver already has an active plan. Please complete or deactivate the current plan before selecting a new one.",
        });
    }

    // Calculate payment breakdown
    const deposit = securityDeposit || 0;
    const slab = selectedRentSlab || {};
    const rent =
      planType === "weekly" ? slab.weeklyRent || 0 : slab.rentDay || 0;
    const cover = planType === "weekly" ? slab.accidentalCover || 105 : 0;
    const totalAmount = deposit + rent + cover;
    const rentPerDay = typeof slab.rentDay === "number" ? slab.rentDay : 0;

    const selection = new DriverPlanSelection({
      driverId: driver ? driver._id : null,
      driverUsername:
        driver && driver.username
          ? driver.username
          : driverUsername || "",
      driverMobile: mobile,
      planName,
      planType,
      securityDeposit: deposit,
      rentSlabs: rentSlabs || [],
      selectedRentSlab: selectedRentSlab || null,
      status: "active",
      paymentStatus: "pending",
      paymentMethod: "Cash",
      calculatedDeposit: deposit,
      calculatedRent: rent,
      calculatedCover: cover,
      calculatedTotal: totalAmount,
      rentStartDate: null,
      rentPerDay: rentPerDay,
    });

    await selection.save();

    // Emit notification: driver booked a plan
    try {
      const { createAndEmitNotification } = await import("../lib/notify.js");
      const amount = selection.calculatedTotal || 0;
      
      // Use driver._id directly for FCM notification
      const driverRecipientId = driver ? String(driver._id) : "";
      
      // Notify driver
      if (driverRecipientId) {
        await createAndEmitNotification({
          type: "driver_booking",
          title: `Plan booked: ${selection.planName}`,
          message: `You have successfully booked ${
            selection.planName
          }. Total ₹${amount.toLocaleString("en-IN")}`,
          data: {
            selectionId: String(selection._id),
            planName: selection.planName,
            amount: String(amount),
          },
          recipientType: "driver",
          recipientId: driverRecipientId,
        });
        console.log(`✅ Public plan booking notification sent to driver ${driverRecipientId}`);
      } else {
        console.log('⚠️ Skipping public plan booking notification - no valid driver found');
      }
      
      // Also create a global/admin notification so admins see new bookings
      await createAndEmitNotification({
        type: "booking_admin",
        title: `Driver booked plan: ${selection.planName}`,
        message: `Driver ${
          selection.driverUsername || selection.driverMobile || "N/A"
        } booked ${selection.planName} (₹${amount.toLocaleString("en-IN")})`,
        data: {
          selectionId: String(selection._id),
          driverId: selection.driverId ? String(selection.driverId) : null,
          amount: String(amount),
        },
        recipientType: "admin",
        recipientId: null,
      });
    } catch (err) {
      console.warn("Notify failed (booking public):", err.message);
    }

    res.status(201).json({
      message: "Plan selected successfully",
      selection,
    });
  } catch (err) {
    console.error("Create public plan selection error:", err);
    res.status(500).json({ message: "Failed to select plan" });
  }
});
// Create new plan selection (Driver selects a plan)
router.post("/", authenticateDriver, async (req, res) => {
  try {
    const { planName, planType, securityDeposit, rentSlabs, selectedRentSlab } =
      req.body;

    if (!planName || !planType) {
      return res
        .status(400)
        .json({ message: "Plan name and type are required" });
    }

    // Get driver info
    const driver = await Driver.findById(req.driver.id);
    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    // Check if driver already has an active selection
    const existingSelection = await DriverPlanSelection.findOne({
      driverId: req.driver.id,
      status: "active",
    });

    if (existingSelection) {
      return res
        .status(400)
        .json({
          message:
            "Driver already has an active plan. Please complete or deactivate the current plan before selecting a new one.",
        });
    }

    // Calculate payment breakdown
    const deposit = securityDeposit || 0;
    const slab = selectedRentSlab || {};
    const rent =
      planType === "weekly" ? slab.weeklyRent || 0 : slab.rentDay || 0;
    const cover = planType === "weekly" ? slab.accidentalCover || 105 : 0;
    const totalAmount = deposit + rent + cover;

    // Lock rent per day from selected slab
    const rentPerDay = typeof slab.rentDay === "number" ? slab.rentDay : 0;

    // Create new selection with calculated values
    const selection = new DriverPlanSelection({
      driverId: req.driver.id,
      driverUsername: driver.username,
      driverMobile: driver.mobile,
      planName,
      planType,
      securityDeposit: deposit,
      rentSlabs: rentSlabs || [],
      selectedRentSlab: selectedRentSlab || null,
      status: "active",
      paymentStatus: "pending",
      paymentMethod: "Cash",
      // Store calculated breakdown
      calculatedDeposit: deposit,
      calculatedRent: rent,
      calculatedCover: cover,
      calculatedTotal: totalAmount,
      // Do NOT start daily rent accrual at plan selection time. rentStartDate will be set when the driver is assigned to a vehicle, when the vehicle becomes active, or via explicit confirmation.
      rentStartDate: null,
      rentPerDay: rentPerDay,
    });

    await selection.save();

    // Emit notification: driver booked a plan
    try {
      const { createAndEmitNotification } = await import("../lib/notify.js");
      const amount = selection.calculatedTotal || 0;
      
      // Use driver._id directly for FCM notification
      const driverRecipientId = String(driver._id);
      
      // Notify driver (use "driver" recipientType)
      if (driverRecipientId) {
        await createAndEmitNotification({
          type: "driver_booking",
          title: `Plan booked: ${selection.planName}`,
          message: `You have successfully booked ${
            selection.planName
          }. Total ₹${amount.toLocaleString("en-IN")}`,
          data: {
            selectionId: String(selection._id),
            planName: selection.planName,
            amount: String(amount),
          },
          recipientType: "driver",
          recipientId: driverRecipientId,
        });
        console.log(`✅ Plan booking notification sent to driver ${driverRecipientId}`);
      }
      
      // Also create a global/admin notification so admins see new bookings
      await createAndEmitNotification({
        type: "booking_admin",
        title: `Driver booked plan: ${selection.planName}`,
        message: `Driver ${
          selection.driverUsername || selection.driverMobile || "N/A"
        } booked ${selection.planName} (₹${amount.toLocaleString("en-IN")})`,
        data: {
          selectionId: String(selection._id),
          driverId: String(driver._id),
          amount: String(amount),
        },
        recipientType: "admin",
        recipientId: null,
      });
    } catch (err) {
      console.warn("Notify failed (booking):", err.message);
    }

    res.status(201).json({
      message: "Plan selected successfully",
      selection,
    });
  } catch (err) {
    console.error("Create plan selection error:", err);
    res.status(500).json({ message: "Failed to select plan" });
  }
});

// POST - Confirm payment for driver plan selection
router.post("/:id/confirm-payment", async (req, res) => {
  try {
    console.log("Confirm driver payment request received:", {
      id: req.params.id,
      body: req.body,
    });

    const { paymentMode, paidAmount, paymentType } = req.body;

    if (!paymentMode || !["online", "cash"].includes(paymentMode)) {
      console.log("Invalid payment mode:", paymentMode);
      return res
        .status(400)
        .json({ message: "Invalid payment mode. Must be online or cash" });
    }

    // Validate manual payment amount if provided
    if (paidAmount !== undefined && paidAmount !== null) {
      const amount = Number(paidAmount);
      if (isNaN(amount) || amount <= 0) {
        return res
          .status(400)
          .json({
            message: "Invalid payment amount. Must be a positive number",
          });
      }
    }

    // Validate payment type
    if (paymentType && !["rent", "security"].includes(paymentType)) {
      return res
        .status(400)
        .json({ message: "Invalid payment type. Must be rent or security" });
    }

    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid plan selection ID" });
    }
    const selection = await DriverPlanSelection.findById(id);
    if (!selection) {
      console.log("Plan selection not found:", id);
      return res.status(404).json({ message: "Plan selection not found" });
    }

    console.log("Current payment status:", selection.paymentStatus);

    // IMPORTANT: Always process and accumulate payments, regardless of current paymentStatus
    // Multiple payments should be recorded, not rejected
    selection.paymentMode = paymentMode;
    selection.paymentStatus = "completed";
    selection.paymentDate = new Date();

    // Store the manually entered payment amount and type (cumulative)
    if (paidAmount !== undefined && paidAmount !== null) {
      const previousAmount = selection.paidAmount || 0;
      const newPayment = Number(paidAmount);
      selection.paidAmount = previousAmount + newPayment;
      selection.paymentType = paymentType || "rent";
      
      // Initialize driverPayments array if it doesn't exist
      if (!selection.driverPayments) {
        selection.driverPayments = [];
      }

      // Add payment record to array for tracking multiple payments
      selection.driverPayments.push({
        date: new Date(),
        amount: newPayment,
        mode: paymentMode,
        type: paymentType || "rent",
        status: "captured"
      });
      
      // Track in depositPaid/rentPaid for proper calculation
      if (paymentType === "security") {
        selection.depositPaid = (selection.depositPaid || 0) + newPayment;
      } else if (paymentType === "rent") {
        selection.rentPaid = (selection.rentPaid || 0) + newPayment;
      }
      
      console.log(
        "Adding payment:",
        newPayment,
        "Previous:",
        previousAmount,
        "New Total:",
        selection.paidAmount,
        "Type:",
        selection.paymentType,
        "Tracked payments:",
        selection.driverPayments.length
      );
    }

    const updatedSelection = await selection.save();
    console.log("Payment confirmed successfully:", {
      id: updatedSelection._id,
      paymentMode: updatedSelection.paymentMode,
      paymentStatus: updatedSelection.paymentStatus,
      paidAmount: updatedSelection.paidAmount,
      paymentType: updatedSelection.paymentType,
    });

    // Emit notification for driver payment (cash/manual)
    try {
      const { createAndEmitNotification } = await import("../lib/notify.js");
      const paymentAmount = paidAmount || updatedSelection.paidAmount || 0;
      // Try to find Driver document to use its _id for notifications (device tokens are registered with Driver._id)
      let recipientId = null;
      if (updatedSelection.driverSignupId) {
        try {
          const driverSignup = await DriverSignup.findById(updatedSelection.driverSignupId).lean();
          if (driverSignup && driverSignup.mobile) {
            const driver = await Driver.findOne({ mobile: driverSignup.mobile }).lean();
            if (driver && driver._id) {
              recipientId = String(driver._id);
              console.log(`[NOTIFY] Using Driver._id ${recipientId} for notification (from driverSignupId ${updatedSelection.driverSignupId})`);
            }
          }
        } catch (lookupErr) {
          console.warn(`[NOTIFY] Failed to lookup Driver from driverSignupId: ${lookupErr.message}`);
        }
      }
      // Only notify the specific driver if we found a valid driver ID
      if (recipientId) {
        await createAndEmitNotification({
          type: "driver_payment",
          title: `Payment received: ₹${paymentAmount.toLocaleString("en-IN")}`,
          message: `Payment of ₹${paymentAmount.toLocaleString(
            "en-IN"
          )} received from you via ${updatedSelection.paymentMode || "cash"}`,
          data: {
            selectionId: updatedSelection._id,
            driverSignupId: String(updatedSelection.driverSignupId || ""),
            amount: paymentAmount,
            paymentType: paymentType || "rent",
            paymentMode: updatedSelection.paymentMode || "cash",
          },
          recipientType: "driver",
          recipientId: recipientId,
        });
      } else {
        console.warn(`[NOTIFY] Could not find valid driver ID for payment notification - skipping driver notification to prevent broadcast to all drivers`);
      }
      // Also notify admins globally
      await createAndEmitNotification({
        type: "driver_payment_admin",
        title: `Driver payment received: ₹${paymentAmount.toLocaleString(
          "en-IN"
        )}`,
        message: `Payment of ₹${paymentAmount.toLocaleString(
          "en-IN"
        )} received from driver ${
          updatedSelection.driverUsername ||
          updatedSelection.driverMobile ||
          "N/A"
        } via ${updatedSelection.paymentMode || "cash"}`,
        data: {
          selectionId: updatedSelection._id,
          driverSignupId: recipientId,
          amount: paymentAmount,
          paymentType: paymentType || "rent",
          paymentMode: updatedSelection.paymentMode || "cash",
        },
        recipientType: "admin",
        recipientId: null,
      });
    } catch (err) {
      console.warn("Notify failed (confirm-payment):", err.message);
    }

    res.json({
      message: "Payment confirmed successfully",
      selection: updatedSelection,
    });
  } catch (error) {
    console.error("Error confirming driver payment:", error);
    res
      .status(500)
      .json({ message: "Failed to confirm payment", error: error.message });
  }
});

// POST - Update online payment from payment gateway callback
router.post("/:id/online-payment", async (req, res) => {
  try {
    console.log("Online payment update request received:", {
      id: req.params.id,
      body: req.body,
    });

    const {
      paymentId,
      amount,
      paymentType,
      status,
      merchantOrderId,
      paymentToken,
      gateway,
      // Optional granular breakdown from client (ZwitchPaymentModal)
      depositAmount,
      rentAmount,
    } = req.body;

    // Basic validation: require a paymentId and a positive numeric amount.
    if (!paymentId) {
      return res
        .status(400)
        .json({ success: false, message: "Payment ID is required" });
    }

    const newPayment = Number(amount);
    if (Number.isNaN(newPayment) || newPayment <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Amount must be a positive number" });
    }

    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid plan selection ID" });
    }

    const selection = await DriverPlanSelection.findById(id);
    if (!selection) {
      console.log("Plan selection not found:", id);
      return res.status(404).json({ message: "Plan selection not found" });
    }

    console.log("Updating plan selection with online payment:", {
      currentStatus: selection.paymentStatus,
      currentPaidAmount: selection.paidAmount,
      newAmount: amount,
      paymentType: paymentType,
      depositAmount,
      rentAmount,
    });

    // Update payment details
    selection.paymentMode = "online";
    selection.paymentMethod = gateway || "ZWITCH";
    selection.paymentStatus = status === "captured" ? "completed" : "pending";
    selection.paymentDate = new Date();
    // Only store "rent" or "security" in the top-level field to satisfy schema enum
    let safePaymentType = paymentType === "security" ? "security" : "rent";
    selection.paymentType = safePaymentType;

    // Add to existing paid amount (cumulative, regardless of breakdown)
    const previousAmount = selection.paidAmount || 0;
    selection.paidAmount = previousAmount + newPayment;

    // Determine how much of this payment goes to deposit vs rent (and other components)
    let depositPaidNow = 0;
    let rentPaidNow = 0;

    const parsedDepositAmount = Number(depositAmount);
    const parsedRentAmount = Number(rentAmount);

    if (!Number.isNaN(parsedDepositAmount) && parsedDepositAmount > 0) {
      depositPaidNow = parsedDepositAmount;
    }
    if (!Number.isNaN(parsedRentAmount) && parsedRentAmount > 0) {
      rentPaidNow = parsedRentAmount;
    }

    // If client didn't send explicit split, infer from (safe) payment type
    if (depositPaidNow === 0 && rentPaidNow === 0) {
      if (safePaymentType === "security") {
        depositPaidNow = newPayment;
      } else {
        // Treat as rent payment by default
        rentPaidNow = newPayment;
      }
    } else {
      // Ensure the split does not exceed total paid; if it does, normalise proportionally
      const splitTotal = depositPaidNow + rentPaidNow;
      if (splitTotal > 0 && splitTotal !== newPayment) {
        const scale = newPayment / splitTotal;
        depositPaidNow = Number((depositPaidNow * scale).toFixed(2));
        rentPaidNow = Number((rentPaidNow * scale).toFixed(2));
      }
    }

    // Update cumulative tracked fields used by calculatePaymentDetails/paymentDetails
    selection.depositPaid = (selection.depositPaid || 0) + depositPaidNow;
    selection.rentPaid = (selection.rentPaid || 0) + rentPaidNow;

    // Initialize driverPayments array if it doesn't exist
    if (!selection.driverPayments) {
      selection.driverPayments = [];
    }

    // Add payment record to array
    selection.driverPayments.push({
      date: new Date(),
      amount: newPayment,
      mode: "online",
      // Store more specific driver payment type; allow "deposit" for reporting if this was only a deposit
      type:
        safePaymentType === "security" && rentPaidNow === 0
          ? "deposit"
          : safePaymentType,
      transactionId: paymentId,
      merchantOrderId: merchantOrderId,
      paymentToken: paymentToken,
      gateway: gateway || "ZWITCH",
      status: status,
    });

    const updatedSelection = await selection.save();

    console.log("Online payment updated successfully:", {
      id: updatedSelection._id,
      paymentMode: updatedSelection.paymentMode,
      paymentStatus: updatedSelection.paymentStatus,
      paidAmount: updatedSelection.paidAmount,
      paymentType: updatedSelection.paymentType,
      totalPayments: updatedSelection.driverPayments?.length || 0,
    });

    // Emit notification for driver payment
    try {
      const { createAndEmitNotification } = await import("../lib/notify.js");
      // Try to find Driver document to use its _id for notifications (device tokens are registered with Driver._id)
      let recipientId = null;
      if (selection.driverSignupId) {
        try {
          const driverSignup = await DriverSignup.findById(selection.driverSignupId).lean();
          if (driverSignup && driverSignup.mobile) {
            const driver = await Driver.findOne({ mobile: driverSignup.mobile }).lean();
            if (driver && driver._id) {
              recipientId = String(driver._id);
              console.log(`[NOTIFY] Using Driver._id ${recipientId} for notification (from driverSignupId ${selection.driverSignupId})`);
            }
          }
        } catch (lookupErr) {
          console.warn(`[NOTIFY] Failed to lookup Driver from driverSignupId: ${lookupErr.message}`);
        }
      }
      // Only notify the specific driver if we found a valid driver ID
      if (recipientId) {
        await createAndEmitNotification({
          type: "driver_payment",
          title: `Payment received: ₹${newPayment.toLocaleString("en-IN")}`,
          message: `Payment of ₹${newPayment.toLocaleString(
            "en-IN"
          )} received from you via ${gateway || "ZWITCH"}`,
          data: {
            selectionId: updatedSelection._id,
            driverSignupId: String(selection.driverSignupId || ""),
            amount: newPayment,
            paymentType: paymentType || "rent",
            paymentMode: "online",
          },
          recipientType: "driver",
          recipientId: recipientId,
        });
      } else {
        console.warn(`[NOTIFY] Could not find valid driver ID for payment notification - skipping driver notification to prevent broadcast to all drivers`);
      }
      // Also notify admins globally
      await createAndEmitNotification({
        type: "driver_payment_admin",
        title: `Driver payment received: ₹${newPayment.toLocaleString(
          "en-IN"
        )}`,
        message: `Payment of ₹${newPayment.toLocaleString(
          "en-IN"
        )} received from driver ${
          selection.driverUsername || selection.driverMobile || "N/A"
        } via ${gateway || "ZWITCH"}`,
        data: {
          selectionId: updatedSelection._id,
          driverSignupId: recipientId,
          amount: newPayment,
          paymentType: paymentType || "rent",
          paymentMode: "online",
        },
        recipientType: "admin",
        recipientId: null,
      });
    } catch (err) {
      console.warn("Notify failed (online-payment):", err.message);
    }

    res.json({
      success: true,
      message: "Online payment recorded successfully",
      selection: updatedSelection,
    });
  } catch (error) {
    console.error("Error recording online payment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to record online payment",
      error: error.message,
    });
  }
});

// GET - Daily rent summary from start date till today
router.get("/:id/rent-summary", async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid plan selection ID" });
    }
    const selection = await DriverPlanSelection.findById(id).lean();
    if (!selection) {
      return res.status(404).json({ message: "Plan selection not found" });
    }

    // If status is inactive, stop calculating rent
    if (selection.status === "inactive" || !selection.rentStartDate) {
      return res.json({
        hasStarted: false,
        totalDays: 0,
        rentPerDay:
          selection.rentPerDay || selection.selectedRentSlab?.rentDay || 0,
        totalDue: 0,
        entries: [],
        status: selection.status,
      });
    }

    const rentPerDay =
      selection.rentPerDay || selection.selectedRentSlab?.rentDay || 0 || 0;
    const start = new Date(selection.rentStartDate);
    const today = new Date();
    // Normalize to local midnight for day-diff consistency
    const toYmd = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    let cur = toYmd(start);
    const end = toYmd(today);

    // Build per-day entries inclusive of start and end
    const entries = [];
    let totalDays = 0;
    while (cur <= end) {
      entries.push({
        date: cur.toISOString().slice(0, 10),
        amount: rentPerDay,
      });
      totalDays += 1;
      cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1);
      // Safety cap: avoid infinite loop due to bad dates
      if (totalDays > 3660) break; // ~10 years cap
    }

    const totalDue = rentPerDay * totalDays;
    return res.json({
      hasStarted: true,
      totalDays,
      rentPerDay,
      totalDue,
      startDate: selection.rentStartDate,
      asOfDate: end.toISOString().slice(0, 10),
      entries,
      status: selection.status,
    });
  } catch (error) {
    console.error("Get daily rent summary error:", error);
    res.status(500).json({ message: "Failed to compute daily rent summary" });
  }
});

// Update plan selection status (Admin endpoint - no auth required for admin)
router.put("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid plan selection ID" });
    }
    const selection = await DriverPlanSelection.findById(id);
    if (!selection) {
      return res.status(404).json({ message: "Plan selection not found" });
    }

    selection.status = status;

    // If making inactive, optionally stop rent calculation by clearing rentStartDate
    // Comment out the next line if you want to keep rent history when reactivating
    // if (status === 'inactive') {
    //   selection.rentStartDate = null;
    // }

    await selection.save();

    res.json({
      message: "Plan selection status updated successfully",
      selection,
    });
  } catch (err) {
    console.error("Update plan selection status error:", err);
    res.status(500).json({ message: "Failed to update plan selection status" });
  }
});

// Update plan selection (Driver endpoint)
router.put("/:id", authenticateDriver, async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid plan selection ID" });
    }
    const selection = await DriverPlanSelection.findById(id);
    if (!selection) {
      return res.status(404).json({ message: "Plan selection not found" });
    }

    // Verify the driver owns this selection
    if (
      !selection.driverSignupId ||
      selection.driverSignupId.toString() !== req.driver.id
    ) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    selection.status = status;
    await selection.save();

    res.json({
      message: "Plan selection updated successfully",
      selection,
    });
  } catch (err) {
    console.error("Update plan selection error:", err);
    res.status(500).json({ message: "Failed to update plan selection" });
  }
});

// Delete plan selection
// Admin or driver can delete
router.delete("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid plan selection ID" });
    }
    const selection = await DriverPlanSelection.findById(id);
    if (!selection) {
      return res.status(404).json({ message: "Plan selection not found" });
    }

    // If driver token is present, check ownership
    const authHeader = req.headers["authorization"];
    if (authHeader) {
      const token = authHeader.split(" ")[1];
      try {
        const SECRET = process.env.JWT_SECRET || "dev_secret";
        const user = jwt.verify(token, SECRET);
        // If driver, check ownership
        if (user && user.role === "driver") {
          if (
            !selection.driverSignupId ||
            selection.driverSignupId.toString() !== user.id
          ) {
            return res.status(403).json({ message: "Unauthorized" });
          }
        }
      } catch (err) {
        // Invalid token, treat as admin (allow)
      }
    }

    await DriverPlanSelection.findByIdAndDelete(req.params.id);
    res.json({ message: "Plan selection deleted successfully" });
  } catch (err) {
    console.error("Delete plan selection error:", err);
    res.status(500).json({ message: "Failed to delete plan selection" });
  }
});

// POST - Webhook endpoint for Zwitch payment gateway callbacks
// This endpoint receives payment status updates directly from Zwitch
router.post("/payment-webhook/zwitch", async (req, res) => {
  try {
    console.log("Zwitch webhook received:", {
      body: req.body,
      headers: req.headers,
    });

    const {
      payment_id,
      payment_token_id,
      status,
      amount,
      merchant_order_id,
      customer_email,
      customer_mobile,
    } = req.body;

    // Acknowledge receipt immediately
    res.status(200).json({ success: true, message: "Webhook received" });

    // Process the payment asynchronously
    if (!payment_id || !status) {
      console.warn("Webhook missing required fields:", req.body);
      return;
    }

    // Extract planSelectionId from merchant_order_id or payment metadata
    let planSelectionId = merchant_order_id;
    
    // If merchant_order_id doesn't look like a valid ObjectId, try to find it another way
    if (!mongoose.Types.ObjectId.isValid(planSelectionId)) {
      console.warn("Invalid planSelectionId in webhook:", planSelectionId);
      return;
    }

    const selection = await DriverPlanSelection.findById(planSelectionId);
    if (!selection) {
      console.warn("Plan selection not found for webhook:", planSelectionId);
      return;
    }

    // Only update if payment is captured/successful
    if (status === "captured" || status === "success") {
      console.log("Processing successful webhook payment for:", planSelectionId);

      selection.paymentMode = "online";
      selection.paymentMethod = "ZWITCH";
      selection.paymentStatus = "completed";
      selection.paymentDate = new Date();
      
      const paymentAmount = Number(amount) || 0;
      const previousAmount = selection.paidAmount || 0;
      selection.paidAmount = previousAmount + paymentAmount;

      // Initialize driverPayments array if it doesn't exist
      if (!selection.driverPayments) {
        selection.driverPayments = [];
      }

      // Add payment record
      selection.driverPayments.push({
        date: new Date(),
        amount: paymentAmount,
        mode: "online",
        type: "security", // Default to security, can be adjusted
        status: "captured",
        paymentId: payment_id,
        tokenId: payment_token_id,
      });

      // Update security deposit tracking
      selection.depositPaid = (selection.depositPaid || 0) + paymentAmount;

      await selection.save();

      console.log("Webhook payment processed successfully:", {
        planSelectionId,
        paymentId: payment_id,
        amount: paymentAmount,
      });

      // Send notification
      try {
        const { createAndEmitNotification } = await import("../lib/notify.js");
        
        // Try to find Driver document for notifications
        let recipientId = null;
        if (selection.driverSignupId) {
          try {
            const DriverSignup = (await import("../models/driverEnrollment.js")).default;
            const driverSignup = await DriverSignup.findById(selection.driverSignupId).lean();
            if (driverSignup && driverSignup.mobile) {
              const driver = await Driver.findOne({ mobile: driverSignup.mobile }).lean();
              if (driver && driver._id) {
                recipientId = String(driver._id);
              }
            }
          } catch (lookupErr) {
            console.warn(`Webhook notification lookup failed: ${lookupErr.message}`);
          }
        }

        if (recipientId) {
          await createAndEmitNotification({
            type: "driver_payment",
            title: `Payment Successful: ₹${paymentAmount.toLocaleString("en-IN")}`,
            message: `Your payment of ₹${paymentAmount.toLocaleString("en-IN")} has been confirmed.`,
            data: {
              selectionId: selection._id,
              paymentId: payment_id,
              amount: paymentAmount,
            },
            recipientType: "driver",
            recipientId: recipientId,
          });
        }
      } catch (notifyErr) {
        console.warn("Webhook notification failed:", notifyErr.message);
      }
    } else {
      console.log(`Webhook status "${status}" - no action taken for:`, planSelectionId);
    }
  } catch (error) {
    console.error("Error processing Zwitch webhook:", error);
    // Don't send error response as we already acknowledged receipt
  }
});

export default router;
