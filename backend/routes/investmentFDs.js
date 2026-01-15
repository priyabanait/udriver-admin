import express from "express";
import InvestmentFD from "../models/investmentFD.js";
import InvestmentPlan from "../models/investmentPlan.js";

const router = express.Router();

// Search investment FDs endpoint
router.get("/search", async (req, res) => {
  try {
    const {
      q, // general search query
      investorName,
      phone,
      email,
      investorId,
      status,
      fdType,
      planId,
      minAmount,
      maxAmount,
      dateFrom,
      dateTo
    } = req.query;

    const filter = {};

    // General search across multiple fields
    if (q && q.trim()) {
      const searchRegex = new RegExp(q.trim(), 'i');
      const normalized = String(q).replace(/\D/g, '').trim();
      
      filter.$or = [
        { investorName: searchRegex },
        { email: searchRegex }
      ];
      
      if (normalized) {
        filter.$or.push({ phone: normalized });
      }
    }

    // Specific field filters
    if (investorId) filter.investorId = investorId;
    if (investorName) filter.investorName = new RegExp(investorName, 'i');
    if (phone) {
      const normalized = String(phone).replace(/\D/g, '');
      filter.phone = normalized;
    }
    if (email) filter.email = new RegExp(email, 'i');
    if (status) filter.status = status;
    if (fdType) filter.fdType = fdType;
    if (planId) filter.planId = planId;

    // Amount range filter
    if (minAmount || maxAmount) {
      filter.investmentAmount = {};
      if (minAmount) filter.investmentAmount.$gte = Number(minAmount);
      if (maxAmount) filter.investmentAmount.$lte = Number(maxAmount);
    }

    // Date range filter
    if (dateFrom || dateTo) {
      filter.investmentDate = {};
      if (dateFrom) filter.investmentDate.$gte = new Date(dateFrom);
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        filter.investmentDate.$lte = endDate;
      }
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const sortBy = req.query.sortBy || "investmentDate";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

    const total = await InvestmentFD.countDocuments(filter);
    const investments = await InvestmentFD.find(filter)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit);

    res.json({
      data: investments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    console.error("Error searching investment FDs:", error);
    res.status(500).json({
      error: "Failed to search investment FDs",
      message: error.message,
    });
  }
});

// GET all investment FDs
router.get("/", async (req, res) => {
  try {
    const { investorId } = req.query;

    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const sortBy = req.query.sortBy || "investmentDate";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

    // Build filter
    const filter = {};
    if (investorId) filter.investorId = investorId;
    
    // Add search support to main GET endpoint
    if (req.query.q && req.query.q.trim()) {
      const searchRegex = new RegExp(req.query.q.trim(), 'i');
      const normalized = String(req.query.q).replace(/\D/g, '').trim();
      
      const searchFilter = {
        $or: [
          { investorName: searchRegex },
          { email: searchRegex }
        ]
      };
      
      if (normalized) {
        searchFilter.$or.push({ phone: normalized });
      }
      
      filter.$and = filter.$and || [];
      filter.$and.push(searchFilter);
    }

    const total = await InvestmentFD.countDocuments(filter);
    const investments = await InvestmentFD.find(filter)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit);

    res.json({
      data: investments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    console.error("Error fetching investment FDs:", error);
    res.status(500).json({
      error: "Failed to fetch investment FDs",
      message: error.message,
    });
  }
});

// GET single investment FD by ID
router.get("/:id", async (req, res) => {
  try {
    const investment = await InvestmentFD.findById(req.params.id);
    if (!investment) {
      return res.status(404).json({ error: "Investment FD not found" });
    }
    res.json(investment);
  } catch (error) {
    console.error("Error fetching investment FD:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch investment FD", message: error.message });
  }
});

// POST - Create new investment FD
router.post("/", async (req, res) => {
  try {
    const {
      investorId,
      investorName,
      email,
      phone,
      address,
      investmentDate,
      paymentMethod,
      investmentRate,
      investmentAmount,
      planId,
      fdType,
      termMonths,
      termYears,
      status,
      maturityDate,
      notes,
      paymentMode,
      paymentStatus,
    } = req.body;

    // Validation
    if (
      !investorName ||
      !phone ||
      !address ||
      !investmentDate ||
      !paymentMethod ||
      !investmentRate ||
      !investmentAmount ||
      !fdType
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Normalize investorId - ensure it's either a valid ObjectId or null
    let normalizedInvestorId = null;
    if (investorId && String(investorId).trim() !== "") {
      try {
        // Try to validate as MongoDB ObjectId
        const mongooseModule = await import("mongoose");
        const isValidId =
          mongooseModule.default.Types.ObjectId.isValid(investorId);
        if (isValidId) {
          normalizedInvestorId = investorId;
        } else {
          console.warn(
            `[FD] Invalid investorId format provided: ${investorId}`
          );
        }
      } catch (e) {
        console.warn(`[FD] Error validating investorId: ${e.message}`);
      }
    }

    console.log("[FD] Normalized investorId:", normalizedInvestorId);

    // Validate FD type
    if (!["monthly", "yearly"].includes(fdType)) {
      return res
        .status(400)
        .json({ error: "Invalid FD type. Must be monthly or yearly" });
    }

    // Validate term based on FD type
    if (
      fdType === "monthly" &&
      (!termMonths || termMonths < 1 || termMonths > 12)
    ) {
      return res
        .status(400)
        .json({ error: "For monthly FD, term must be between 1-12 months" });
    }
    if (
      fdType === "yearly" &&
      (!termYears || termYears < 1 || termYears > 10)
    ) {
      return res
        .status(400)
        .json({ error: "For yearly FD, term must be between 1-10 years" });
    }

    // Validate payment method
    const validPaymentMethods = [
      "Cash",
      "Bank Transfer",
      "Cheque",
      "Online",
      "UPI",
    ];
    if (!validPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({ error: "Invalid payment method" });
    }

    // Validate numbers
    if (isNaN(investmentRate) || parseFloat(investmentRate) < 0) {
      return res.status(400).json({ error: "Invalid investment rate" });
    }
    if (isNaN(investmentAmount) || parseFloat(investmentAmount) <= 0) {
      return res.status(400).json({ error: "Invalid investment amount" });
    }

    // Calculate maturity date if not provided
    let calculatedMaturityDate = maturityDate ? new Date(maturityDate) : null;
    if (!calculatedMaturityDate) {
      const invDate = new Date(investmentDate);
      if (fdType === "monthly") {
        calculatedMaturityDate = new Date(
          invDate.setMonth(invDate.getMonth() + parseInt(termMonths))
        );
      } else if (fdType === "yearly") {
        calculatedMaturityDate = new Date(
          invDate.setFullYear(invDate.getFullYear() + parseInt(termYears))
        );
      }
    }

    // Resolve plan name if planId provided
    let resolvedPlanId = null;
    let resolvedPlanName = "";
    if (planId) {
      try {
        const plan = await InvestmentPlan.findById(planId).select("name");
        if (!plan) {
          return res
            .status(400)
            .json({ error: "Invalid planId: plan not found" });
        }
        resolvedPlanId = plan._id;
        resolvedPlanName = plan.name || "";
      } catch (e) {
        return res.status(400).json({ error: "Invalid planId format" });
      }
    }

    // Normalize paymentMode input (if provided) to match schema enum
    let normalizedPaymentMode = undefined;
    if (
      paymentMode !== undefined &&
      paymentMode !== null &&
      String(paymentMode).trim() !== ""
    ) {
      const allowedPM = ["Cash", "Bank Transfer", "Cheque", "Online", "UPI"];
      const pmMatch = allowedPM.find(
        (a) => a.toLowerCase() === String(paymentMode).trim().toLowerCase()
      );
      if (!pmMatch) {
        return res.status(400).json({ error: "Invalid paymentMode" });
      }
      normalizedPaymentMode = pmMatch;
    }

    // Normalize paymentStatus input (accept 'completed' as synonym for 'paid')
    let normalizedPaymentStatus = undefined;
    if (
      paymentStatus !== undefined &&
      paymentStatus !== null &&
      String(paymentStatus).trim() !== ""
    ) {
      let _ps = String(paymentStatus).trim().toLowerCase();
      if (_ps === "completed") _ps = "paid";
      const allowedPS = ["pending", "partial", "paid"];
      if (!_ps || !allowedPS.includes(_ps)) {
        return res.status(400).json({ error: "Invalid paymentStatus" });
      }
      normalizedPaymentStatus = _ps;
    }

    // Create new investment FD
    // Calculate maturity amount using helper
    const { computeFdMaturity } = await import("../lib/fdCalc.js");
    const { maturityAmount } = computeFdMaturity({
      principal: parseFloat(investmentAmount),
      ratePercent: parseFloat(investmentRate),
      fdType,
      termMonths: parseInt(termMonths),
      termYears: parseInt(termYears),
    });

    const newInvestment = new InvestmentFD({
      investorId: normalizedInvestorId,
      investorName: investorName.trim(),
      email: email ? email.trim() : "",
      phone: phone.trim(),
      address: address.trim(),
      investmentDate: new Date(investmentDate),
      paymentMethod,
      investmentRate: parseFloat(investmentRate),
      investmentAmount: parseFloat(investmentAmount),
      planId: resolvedPlanId,
      planName: resolvedPlanName,
      fdType,
      termMonths: fdType === "monthly" ? parseInt(termMonths) : undefined,
      termYears: fdType === "yearly" ? parseInt(termYears) : undefined,
      status: status || "active",
      maturityDate: calculatedMaturityDate,
      notes: notes || "",
      maturityAmount,
      ...(normalizedPaymentMode && { paymentMode: normalizedPaymentMode }),
      paymentStatus: normalizedPaymentStatus || "pending",
      ...(normalizedPaymentStatus === "paid" && { paymentDate: new Date() }),
    });

    const savedInvestment = await newInvestment.save();
    console.log(
      "[FD-INVESTMENTFDS] FD saved with investorId:",
      savedInvestment.investorId,
      "Type:",
      typeof savedInvestment.investorId
    );
    // Emit dashboard notification for new investment FD
    try {
      const { createAndEmitNotification } = await import("../lib/notify.js");
      const Investor = (await import('../models/investor.js')).default;
      const InvestorSignup = (await import('../models/investorSignup.js')).default;
      
      console.log(
        "[FD-INVESTMENTFDS] About to send notification with recipientId:",
        savedInvestment.investorId
      );

      // Convert investorId to actual Investor._id if needed
      let investorRecipientId = savedInvestment.investorId ? String(savedInvestment.investorId) : null;
      
      if (investorRecipientId) {
        try {
          let investor = await Investor.findById(String(investorRecipientId)).lean();
          if (!investor) {
            // Might be InvestorSignup ID, try to find by phone
            const investorSignup = await InvestorSignup.findById(String(investorRecipientId)).lean();
            if (investorSignup && investorSignup.phone) {
              investor = await Investor.findOne({ phone: investorSignup.phone }).lean();
              if (investor && investor._id) {
                investorRecipientId = String(investor._id);
                console.log(`[FD-INVESTMENTFDS] Using Investor._id ${investorRecipientId} for notification`);
              }
            }
          }
        } catch (e) {
          console.warn('[FD-INVESTMENTFDS] Investor lookup failed:', e.message);
        }
        
        console.log(
          "[FD-INVESTMENTFDS] Calling createAndEmitNotification with:"
        );
        console.log({
          type: "new_fd",
          recipientType: "investor",
          recipientId: investorRecipientId,
          recipientIdType: typeof investorRecipientId,
        });
        await createAndEmitNotification({
          type: "new_fd",
          title: `New FD created - ${
            savedInvestment.investorName || savedInvestment.phone
          }`,
          message: `FD of ₹${savedInvestment.investmentAmount} created.`,
          data: {
            id: String(savedInvestment._id),
            investorId: String(savedInvestment.investorId || ''),
          },
          recipientType: "investor",
          recipientId: investorRecipientId,
        });
        console.log("[FD-INVESTMENTFDS] Notification sent successfully");
      } else {
        console.warn(
          "[FD-INVESTMENTFDS] No investorId - skipping targeted notification"
        );
      }
    } catch (err) {
      console.warn("Notify failed:", err.message);
    }
    res.status(201).json(savedInvestment);
  } catch (error) {
    console.error("Error creating investment FD:", error);
    res.status(500).json({
      error: "Failed to create investment FD",
      message: error.message,
    });
  }
});

// PUT - Update investment FD
router.put("/:id", async (req, res) => {
  try {
    const {
      investorName,
      email,
      phone,
      address,
      investmentDate,
      paymentMethod,
      investmentRate,
      investmentAmount,
      planId,
      fdType,
      termMonths,
      termYears,
      status,
      maturityDate,
      notes,
      paymentStatus,
      paymentDate,
      paymentMode,
    } = req.body;

    // Find investment
    const investment = await InvestmentFD.findById(req.params.id);
    if (!investment) {
      return res.status(404).json({ error: "Investment FD not found" });
    }

    // Validate FD type if provided
    if (fdType && !["monthly", "yearly"].includes(fdType)) {
      return res
        .status(400)
        .json({ error: "Invalid FD type. Must be monthly or yearly" });
    }

    // Validate term based on FD type
    if (
      fdType === "monthly" &&
      termMonths !== undefined &&
      (termMonths < 1 || termMonths > 12)
    ) {
      return res
        .status(400)
        .json({ error: "For monthly FD, term must be between 1-12 months" });
    }
    if (
      fdType === "yearly" &&
      termYears !== undefined &&
      (termYears < 1 || termYears > 10)
    ) {
      return res
        .status(400)
        .json({ error: "For yearly FD, term must be between 1-10 years" });
    }

    // Validate payment method if provided
    if (paymentMethod) {
      const validPaymentMethods = [
        "Cash",
        "Bank Transfer",
        "Cheque",
        "Online",
        "UPI",
      ];
      if (!validPaymentMethods.includes(paymentMethod)) {
        return res.status(400).json({ error: "Invalid payment method" });
      }
    }

    // Validate payment mode if provided (case-insensitive)
    if (
      paymentMode !== undefined &&
      paymentMode !== null &&
      String(paymentMode).trim() !== ""
    ) {
      const validPaymentModes = [
        "Cash",
        "Bank Transfer",
        "Cheque",
        "Online",
        "UPI",
      ];
      const pmMatch = validPaymentModes.find(
        (a) => a.toLowerCase() === String(paymentMode).trim().toLowerCase()
      );
      if (!pmMatch) {
        return res.status(400).json({ error: "Invalid payment mode" });
      }
    }

    // Validate payment status if provided (accept 'completed' synonym)
    if (
      paymentStatus !== undefined &&
      paymentStatus !== null &&
      String(paymentStatus).trim() !== ""
    ) {
      let _ps = String(paymentStatus).trim().toLowerCase();
      if (_ps === "completed") _ps = "paid";
      const validPaymentStatuses = ["pending", "partial", "paid"];
      if (!validPaymentStatuses.includes(_ps)) {
        return res.status(400).json({ error: "Invalid payment status" });
      }
    }

    // Validate numbers if provided
    if (
      investmentRate !== undefined &&
      (isNaN(investmentRate) || parseFloat(investmentRate) < 0)
    ) {
      return res.status(400).json({ error: "Invalid investment rate" });
    }
    if (
      investmentAmount !== undefined &&
      (isNaN(investmentAmount) || parseFloat(investmentAmount) <= 0)
    ) {
      return res.status(400).json({ error: "Invalid investment amount" });
    }

    // Update fields
    if (investorName !== undefined)
      investment.investorName = investorName.trim();
    if (email !== undefined) investment.email = email.trim();
    if (phone !== undefined) investment.phone = phone.trim();
    if (address !== undefined) investment.address = address.trim();
    if (investmentDate !== undefined)
      investment.investmentDate = new Date(investmentDate);
    if (paymentMethod !== undefined) investment.paymentMethod = paymentMethod;
    if (investmentRate !== undefined)
      investment.investmentRate = parseFloat(investmentRate);
    if (investmentAmount !== undefined)
      investment.investmentAmount = parseFloat(investmentAmount);
    if (fdType !== undefined) investment.fdType = fdType;
    if (termMonths !== undefined)
      investment.termMonths =
        investment.fdType === "monthly" ? parseInt(termMonths) : undefined;
    if (termYears !== undefined)
      investment.termYears =
        investment.fdType === "yearly" ? parseInt(termYears) : undefined;

    // Recalculate maturityAmount if relevant fields changed
    if (
      investmentAmount !== undefined ||
      investmentRate !== undefined ||
      fdType !== undefined ||
      termMonths !== undefined ||
      termYears !== undefined
    ) {
      const { computeFdMaturity } = await import("../lib/fdCalc.js");
      const { maturityAmount } = computeFdMaturity({
        principal: investment.investmentAmount,
        ratePercent: investment.investmentRate,
        fdType: investment.fdType,
        termMonths: investment.termMonths,
        termYears: investment.termYears,
      });
      investment.maturityAmount = maturityAmount;
    }

    // Update plan if provided
    if (planId !== undefined) {
      if (!planId) {
        investment.planId = null;
        investment.planName = "";
      } else {
        try {
          const plan = await InvestmentPlan.findById(planId).select("name");
          if (!plan) {
            return res
              .status(400)
              .json({ error: "Invalid planId: plan not found" });
          }
          investment.planId = plan._id;
          investment.planName = plan.name || "";
        } catch (e) {
          return res.status(400).json({ error: "Invalid planId format" });
        }
      }
    }
    if (status !== undefined) investment.status = status;
    if (paymentStatus !== undefined) investment.paymentStatus = paymentStatus;
    if (paymentDate !== undefined)
      investment.paymentDate = paymentDate ? new Date(paymentDate) : null;
    if (paymentMode !== undefined) investment.paymentMode = paymentMode;

    // Handle TDS percent if provided (calculate tdsAmount server-side to avoid tampering)
    if (req.body.tdsPercent !== undefined) {
      const tdsPercent = Number(req.body.tdsPercent) || 0;
      if (tdsPercent < 0 || tdsPercent > 100) {
        return res.status(400).json({ error: 'Invalid tdsPercent value' });
      }
      investment.tdsPercent = tdsPercent;

      // Compute tdsAmount from maturity interest (maturityAmount - investmentAmount)
      const interest = (investment.maturityAmount || 0) - (investment.investmentAmount || 0);
      const tdsAmount = Math.round(((interest * tdsPercent) / 100 + Number.EPSILON) * 100) / 100;
      investment.tdsAmount = tdsAmount;
    }

    // If payment status changed to paid and tdsPercent exists but tdsAmount is not set, compute it
    if (investment.paymentStatus === 'paid' && (investment.tdsPercent || 0) > 0 && (!investment.tdsAmount || investment.tdsAmount === 0)) {
      const interest = (investment.maturityAmount || 0) - (investment.investmentAmount || 0);
      investment.tdsAmount = Math.round(((interest * investment.tdsPercent) / 100 + Number.EPSILON) * 100) / 100;
    }

    // Recalculate maturity date if investment date or term changed
    if (
      (investmentDate !== undefined ||
        fdType !== undefined ||
        termMonths !== undefined ||
        termYears !== undefined) &&
      maturityDate === undefined
    ) {
      const invDate = new Date(investment.investmentDate);
      if (investment.fdType === "monthly" && investment.termMonths) {
        investment.maturityDate = new Date(
          invDate.setMonth(invDate.getMonth() + investment.termMonths)
        );
      } else if (investment.fdType === "yearly" && investment.termYears) {
        investment.maturityDate = new Date(
          invDate.setFullYear(invDate.getFullYear() + investment.termYears)
        );
      }
    } else if (maturityDate !== undefined) {
      investment.maturityDate = maturityDate ? new Date(maturityDate) : null;
    }

    if (notes !== undefined) investment.notes = notes;

    const updatedInvestment = await investment.save();
    res.json(updatedInvestment);
  } catch (error) {
    console.error("Error updating investment FD:", error);
    res.status(500).json({
      error: "Failed to update investment FD",
      message: error.message,
    });
  }
});

// DELETE - Remove investment FD
router.delete("/:id", async (req, res) => {
  try {
    const investment = await InvestmentFD.findByIdAndDelete(req.params.id);
    if (!investment) {
      return res.status(404).json({ error: "Investment FD not found" });
    }
    res.json({ message: "Investment FD deleted successfully", investment });
  } catch (error) {
    console.error("Error deleting investment FD:", error);
    res.status(500).json({
      error: "Failed to delete investment FD",
      message: error.message,
    });
  }
});

// POST - Confirm payment for FD
router.post("/:id/confirm-payment", async (req, res) => {
  try {
    console.log("Confirm payment request received:", {
      id: req.params.id,
      body: req.body,
    });

    const { paymentMode } = req.body;

    if (!paymentMode) {
      console.log("Invalid payment mode:", paymentMode);
      return res
        .status(400)
        .json({ error: "Invalid payment mode. Must be online or cash" });
    }

    const investment = await InvestmentFD.findById(req.params.id);
    if (!investment) {
      console.log("Investment FD not found:", req.params.id);
      return res.status(404).json({ error: "Investment FD not found" });
    }

    console.log("Current investment payment status:", investment.paymentStatus);

    if (investment.paymentStatus === "paid") {
      return res.status(400).json({ error: "Payment already completed" });
    }

    // Map incoming short values (online/cash) to schema enum values
    const mapping = { online: "Online", cash: "Cash" };
    const normalized = String(paymentMode).trim().toLowerCase();
    if (!mapping[normalized]) {
      console.log(
        "Invalid payment mode value (expected online or cash):",
        paymentMode
      );
      return res
        .status(400)
        .json({ error: "Invalid payment mode. Must be online or cash" });
    }

    investment.paymentMode = mapping[normalized];
    investment.paymentStatus = "paid";
    investment.paymentDate = new Date();

    // Support optional tdsPercent in confirm-payment (server calculates tdsAmount)
    if (req.body.tdsPercent !== undefined) {
      const tdsPercent = Number(req.body.tdsPercent) || 0;
      if (tdsPercent < 0 || tdsPercent > 100) {
        return res.status(400).json({ error: 'Invalid tdsPercent value' });
      }
      investment.tdsPercent = tdsPercent;
      const interest = (investment.maturityAmount || 0) - (investment.investmentAmount || 0);
      investment.tdsAmount = Math.round(((interest * tdsPercent) / 100 + Number.EPSILON) * 100) / 100;
    }

    const updatedInvestment = await investment.save();
    console.log("Payment confirmed successfully:", {
      id: updatedInvestment._id,
      paymentMode: updatedInvestment.paymentMode,
      paymentStatus: updatedInvestment.paymentStatus,
    });

    res.json({
      message: "Payment confirmed successfully",
      investment: updatedInvestment,
    });
  } catch (error) {
    console.error("Error confirming payment:", error);
    res
      .status(500)
      .json({ error: "Failed to confirm payment", message: error.message });
  }
});

// GET statistics
router.get("/stats/summary", async (req, res) => {
  try {
    const [totalInvestments, activeInvestments, stats] = await Promise.all([
      InvestmentFD.countDocuments(),
      InvestmentFD.countDocuments({ status: "active" }),
      InvestmentFD.aggregate([
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$investmentAmount" },
            avgRate: { $avg: "$investmentRate" },
          },
        },
      ]),
    ]);

    res.json({
      totalInvestments,
      activeInvestments,
      totalAmount: stats[0]?.totalAmount || 0,
      avgRate: stats[0]?.avgRate || 0,
    });
  } catch (error) {
    console.error("Error fetching investment FD stats:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch statistics", message: error.message });
  }
});

export default router;
