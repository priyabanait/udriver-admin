import express from "express";
import {
  listNotifications,
  markAsRead,
  sendNotificationToAppType,
  sendNotificationToSpecificUsers,
} from "../lib/notify.js";
import Driver from "../models/driver.js";
import Investor from "../models/investor.js";
import DeviceToken from "../models/deviceToken.js";
import Notification from "../models/notification.js";

const router = express.Router();

/**
 * DEBUG endpoint - List all notifications in database
 * GET /api/notifications/debug/all
 */
router.get("/debug/all", async (req, res) => {
  try {
    const allNotifs = await Notification.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json({
      total: await Notification.countDocuments(),
      count: allNotifs.length,
      notifications: allNotifs.map((n) => ({
        _id: n._id,
        type: n.type,
        title: n.title?.substring(0, 50),
        recipientType: n.recipientType,
        recipientId: n.recipientId,
        read: n.read,
        createdAt: n.createdAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DEBUG endpoint - List unread notifications in database
 * GET /api/notifications/debug/unread
 */
router.get("/debug/unread", async (req, res) => {
  try {
    const unreadNotifs = await Notification.find({ read: false })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    const totalUnread = await Notification.countDocuments({ read: false });
    res.json({
      totalUnread,
      count: unreadNotifs.length,
      notifications: unreadNotifs.map((n) => ({
        _id: n._id,
        type: n.type,
        title: n.title?.substring(0, 50),
        recipientType: n.recipientType,
        recipientId: n.recipientId,
        read: n.read,
        createdAt: n.createdAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get unread notification count
 * GET /api/notifications/count/unread
 */
router.get("/count/unread", async (req, res) => {
  try {
    const { driverId, investorId, recipientType, recipientId } = req.query;
    
    let query = { read: false };
    
    if (driverId) {
      const normalizedDriverId = String(driverId);
      query = {
        read: false,
        $or: [
          { recipientType: "driver", recipientId: normalizedDriverId },
          { recipientType: "driver", recipientId: null },
        ],
      };
      console.log(`[COUNT] Counting unread for driver ${normalizedDriverId}:`, JSON.stringify(query, null, 2));
    } else if (investorId) {
      const normalizedInvestorId = String(investorId);
      query = {
        read: false,
        $or: [
          { recipientType: "investor", recipientId: normalizedInvestorId },
          { recipientType: "investor", recipientId: null },
        ],
      };
      console.log(`[COUNT] Counting unread for investor ${normalizedInvestorId}:`, JSON.stringify(query, null, 2));
    } else if (recipientType && recipientId) {
      const normalizedRecipientType = String(recipientType).toLowerCase();
      const normalizedRecipientId = String(recipientId);
      query = {
        read: false,
        $or: [
          { recipientType: normalizedRecipientType, recipientId: normalizedRecipientId },
          { recipientType: normalizedRecipientType, recipientId: null },
        ],
      };
      console.log(`[COUNT] Counting unread for ${normalizedRecipientType}/${normalizedRecipientId}:`, JSON.stringify(query, null, 2));
    } else if (recipientType) {
      // For users checking unread count for a specific type without ID (e.g., all driver or investor notifications)
      const normalizedRecipientType = String(recipientType).toLowerCase();
      query = {
        read: false,
        recipientType: normalizedRecipientType,
      };
      console.log(`[COUNT] Counting unread for all ${normalizedRecipientType}:`, JSON.stringify(query, null, 2));
    } else {
      // For admin view with no filters - count ALL unread notifications
      console.log(`[COUNT] Counting all unread notifications (admin view):`, JSON.stringify(query, null, 2));
    }
    
    const unreadCount = await Notification.countDocuments(query);
    console.log(`[COUNT] Result: ${unreadCount} unread notifications`);
    res.json({ unreadCount });
  } catch (err) {
    console.error("Error fetching unread count:", err);
    res.status(500).json({ message: "Failed to fetch unread count", error: err.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100); // Cap at 100
    const { driverId, investorId, recipientType, recipientId } = req.query;
    const result = await listNotifications({
      page,
      limit,
      driverId,
      investorId,
      recipientType,
      recipientId,
    });
    // Ensure consistent response format
    if (result && result.items) {
      res.json(result);
    } else {
      res.json({
        items: [],
        pagination: { total: 0, page, limit, totalPages: 0 },
      });
    }
  } catch (err) {
    console.error("Error fetching notifications:", err);
    res
      .status(500)
      .json({ message: "Failed to fetch notifications", error: err.message });
  }
});

/**
 * Get notifications for a specific investor
 * GET /api/notifications/investor/:investorId
 */
router.get("/investor/:investorId", async (req, res) => {
  try {
    const { investorId } = req.params;
    if (!investorId) {
      return res
        .status(400)
        .json({ message: "investorId parameter is required" });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const result = await listNotifications({
      page,
      limit,
      investorId: String(investorId),
    });

    // Ensure consistent response format
    if (result && result.items) {
      res.json(result);
    } else {
      res.json({
        items: [],
        pagination: { total: 0, page, limit, totalPages: 0 },
      });
    }
  } catch (err) {
    console.error("Error fetching investor notifications:", err);
    res
      .status(500)
      .json({ message: "Failed to fetch notifications", error: err.message });
  }
});

/**
 * Get notifications for a specific driver
 * GET /api/notifications/driver/:driverId
 */
router.get("/driver/:driverId", async (req, res) => {
  try {
    const { driverId } = req.params;
    if (!driverId) {
      return res
        .status(400)
        .json({ message: "driverId parameter is required" });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const result = await listNotifications({
      page,
      limit,
      driverId: String(driverId),
    });

    // Ensure consistent response format
    if (result && result.items) {
      res.json(result);
    } else {
      res.json({
        items: [],
        pagination: { total: 0, page, limit, totalPages: 0 },
      });
    }
  } catch (err) {
    console.error("Error fetching driver notifications:", err);
    res
      .status(500)
      .json({ message: "Failed to fetch notifications", error: err.message });
  }
});

/**
 * Mark all notifications as read for a specific investor
 * POST /api/notifications/investor/:investorId/read-all
 */
router.post("/investor/:investorId/read-all", async (req, res) => {
  try {
    const { investorId } = req.params;
    if (!investorId) {
      return res
        .status(400)
        .json({ message: "investorId parameter is required" });
    }

    console.log(`[READ-ALL] Marking all notifications as read for investor ${investorId}`);
    
    const { markAllAsRead } = await import("../lib/notify.js");
    const result = await markAllAsRead({
      recipientType: "investor",
      recipientId: String(investorId),
    });
    
    console.log(`[READ-ALL] Marked ${result.modifiedCount} investor notifications as read for investor ${investorId}`);
    console.log(`[READ-ALL] MongoDB result:`, result);
    
    // Verify the count is now 0
    const { Notification } = await import("../models/notification.js");
    const verifyQuery = {
      read: false,
      $or: [
        { recipientType: "investor", recipientId: String(investorId) },
        { recipientType: "investor", recipientId: null },
      ],
    };
    const remainingUnread = await Notification.countDocuments(verifyQuery);
    console.log(`[READ-ALL] Verification: ${remainingUnread} unread notifications remaining for investor ${investorId}`);
    
    res.json({ 
      message: "All notifications marked as read", 
      result,
      modifiedCount: result.modifiedCount,
      investorId,
      remainingUnread
    });
  } catch (err) {
    console.error("Error marking investor notifications as read:", err);
    res.status(500).json({
      message: "Failed to mark notifications as read",
      error: err.message,
    });
  }
});

/**
 * Mark all notifications as read for a specific driver
 * POST /api/notifications/driver/:driverId/read-all
 */
router.post("/driver/:driverId/read-all", async (req, res) => {
  try {
    const { driverId } = req.params;
    if (!driverId) {
      return res
        .status(400)
        .json({ message: "driverId parameter is required" });
    }

    console.log(`[READ-ALL] Marking all notifications as read for driver ${driverId}`);
    
    const { markAllAsRead } = await import("../lib/notify.js");
    const result = await markAllAsRead({
      recipientType: "driver",
      recipientId: String(driverId),
    });
    
    console.log(`[READ-ALL] Marked ${result.modifiedCount} driver notifications as read for driver ${driverId}`);
    console.log(`[READ-ALL] MongoDB result:`, result);
    
    // Verify the count is now 0
    const { Notification } = await import("../models/notification.js");
    const verifyQuery = {
      read: false,
      $or: [
        { recipientType: "driver", recipientId: String(driverId) },
        { recipientType: "driver", recipientId: null },
      ],
    };
    const remainingUnread = await Notification.countDocuments(verifyQuery);
    console.log(`[READ-ALL] Verification: ${remainingUnread} unread notifications remaining for driver ${driverId}`);
    
    res.json({ 
      message: "All notifications marked as read", 
      result,
      modifiedCount: result.modifiedCount,
      driverId,
      remainingUnread
    });
  } catch (err) {
    console.error("Error marking driver notifications as read:", err);
    res.status(500).json({
      message: "Failed to mark notifications as read",
      error: err.message,
    });
  }
});

/**
 * Mark all notifications as read for admin
 * POST /api/notifications/admin/read-all
 */
router.post("/admin/read-all", async (req, res) => {
  try {
    console.log(`[READ-ALL] Marking all admin notifications as read`);
    
    const { markAllAsRead } = await import("../lib/notify.js");
    // For admins, mark ALL unread notifications (no recipient type filter)
    const result = await markAllAsRead({
      recipientType: null,
      recipientId: null,
    });
    
    console.log(`[READ-ALL] Marked ${result.modifiedCount} admin notifications as read`);
    console.log(`[READ-ALL] MongoDB result:`, result);
    
    // Verify the count is now 0
    const { Notification } = await import("../models/notification.js");
    const verifyQuery = {
      read: false,
    };
    const remainingUnread = await Notification.countDocuments(verifyQuery);
    console.log(`[READ-ALL] Verification: ${remainingUnread} unread notifications remaining`);
    
    res.json({ 
      message: "All admin notifications marked as read", 
      result,
      modifiedCount: result.modifiedCount,
      remainingUnread
    });
  } catch (err) {
    console.error("Error marking admin notifications as read:", err);
    res.status(500).json({
      message: "Failed to mark notifications as read",
      error: err.message,
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const { type, title, message, data, recipientType, recipientId } =
      req.body || {};
    if (!type || (!title && !message)) {
      return res
        .status(400)
        .json({ message: "type and title/message required" });
    }
    const { createAndEmitNotification } = await import("../lib/notify.js");
    const note = await createAndEmitNotification({
      type,
      title,
      message,
      data,
      recipientType,
      recipientId,
    });
    res.status(201).json(note);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to create notification", error: err.message });
  }
});

router.post("/:id/read", async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: "Notification ID is required" });
    }
    const updated = await markAsRead(id);
    if (!updated) {
      return res.status(404).json({ message: "Notification not found" });
    }
    res.json(updated);
  } catch (err) {
    console.error("Error marking notification as read:", err);
    res.status(500).json({
      message: "Failed to mark notification as read",
      error: err.message,
    });
  }
});

/**
 * Admin endpoint to send notifications to driver app or investor app
 * POST /api/notifications/admin/send
 *
 * Body:
 * {
 *   apps: ['customer', 'driver'], // 'customer' = driver app, 'driver' = investor app
 *   sendType: 'now' | 'schedule',
 *   scheduledTime?: Date, // Required if sendType is 'schedule'
 *   data: {
 *     common: { title, message, link } // if same message
 *     // OR
 *     driver: { title, message, link },
 *     investor: { title, message, link }
 *   }
 * }
 */
router.post("/admin/send", async (req, res) => {
  try {
    const { apps, sendType, scheduledTime, data } = req.body || {};

    // Validate required fields
    if (!apps || !Array.isArray(apps) || apps.length === 0) {
      return res
        .status(400)
        .json({ message: "apps array is required and must not be empty" });
    }

    if (!sendType || !["now", "schedule"].includes(sendType)) {
      return res
        .status(400)
        .json({ message: 'sendType must be "now" or "schedule"' });
    }

    if (sendType === "schedule" && !scheduledTime) {
      return res.status(400).json({
        message: 'scheduledTime is required when sendType is "schedule"',
      });
    }

    if (!data || (!data.common && !data.driver && !data.investor)) {
      return res
        .status(400)
        .json({ message: "data.common or data.driver/investor is required" });
    }

    // Map frontend app names to backend app types
    // Frontend: 'customer' = Driver App, 'driver' = Investor App
    // Backend: 'driver' = driver app, 'investor' = investor app
    const appTypeMap = {
      customer: "driver", // Frontend 'customer' maps to backend 'driver' app
      driver: "investor", // Frontend 'driver' maps to backend 'investor' app
    };

    const results = [];
    const errors = [];

    // Handle scheduling (for now, we'll just store it in the notification data)
    // In a production system, you'd want a job queue (like Bull, Agenda, etc.)
    if (sendType === "schedule") {
      // Store scheduled notification - in a real system, you'd queue this
      // For now, we'll create it but note it's scheduled
      console.log("Scheduled notification requested for:", scheduledTime);
      // TODO: Implement proper scheduling with a job queue
    }

    // Process each selected app
    for (const app of apps) {
      const backendAppType = appTypeMap[app];

      if (!backendAppType) {
        errors.push({ app, error: `Unknown app type: ${app}` });
        continue;
      }

      try {
        // Determine which data to use
        let notificationData;
        if (data.common) {
          // Same message for all apps
          notificationData = {
            title: data.common.title || "",
            message: data.common.message || "",
            data: {
              link: data.common.link || "",
              scheduledTime:
                sendType === "schedule" ? scheduledTime : undefined,
            },
          };
        } else {
          // Different message per app
          const appData = data[backendAppType] || data[app];
          if (!appData) {
            errors.push({ app, error: `No data provided for ${app}` });
            continue;
          }
          notificationData = {
            title: appData.title || "",
            message: appData.message || "",
            data: {
              link: appData.link || "",
              scheduledTime:
                sendType === "schedule" ? scheduledTime : undefined,
            },
          };
        }

        // Send notification to all users of this app type
        if (sendType === "now") {
          const note = await sendNotificationToAppType({
            appType: backendAppType,
            title: notificationData.title,
            message: notificationData.message,
            data: notificationData.data,
            type: "admin_broadcast",
          });
          results.push({
            app,
            appType: backendAppType,
            notificationId: note._id,
            status: "sent",
          });
        } else {
          // For scheduled notifications, we'd typically queue them
          // For now, create the notification but mark it as scheduled
          const { createAndEmitNotification } = await import(
            "../lib/notify.js"
          );
          const note = await createAndEmitNotification({
            type: "admin_broadcast_scheduled",
            title: notificationData.title,
            message: notificationData.message,
            data: {
              ...notificationData.data,
              scheduledFor: scheduledTime,
              appType: backendAppType,
            },
            recipientType: backendAppType,
            recipientId: null,
          });
          results.push({
            app,
            appType: backendAppType,
            notificationId: note._id,
            status: "scheduled",
            scheduledTime,
          });
        }
      } catch (err) {
        console.error(
          `Error sending notification to ${app} (${backendAppType}):`,
          err
        );
        errors.push({
          app,
          appType: backendAppType,
          error: err.message,
        });
      }
    }

    // Return results
    if (errors.length > 0 && results.length === 0) {
      return res.status(500).json({
        message: "Failed to send notifications",
        errors,
      });
    }

    res.status(200).json({
      message: "Notifications processed",
      results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error("Error in admin send notification:", err);
    res
      .status(500)
      .json({ message: "Failed to send notifications", error: err.message });
  }
});

/**
 * Get list of drivers for notification selection
 * GET /api/notifications/admin/drivers
 */
router.get("/admin/drivers", async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 100, 10), 100); // Between 10-100
    const { search = "" } = req.query;
    
    let query = {};

    // If search is provided, search across name, phone, email, and mobile fields
    if (search && search.trim()) {
      query = {
        $or: [
          { name: { $regex: search.trim(), $options: "i" } },
          { phone: { $regex: search.trim(), $options: "i" } },
          { mobile: { $regex: search.trim(), $options: "i" } },
          { email: { $regex: search.trim(), $options: "i" } },
        ],
      };
    }

    const total = await Driver.countDocuments(query);
    const skip = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);

    const drivers = await Driver.find(query)
      .select("_id name phone mobile email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    console.log(`Fetched ${drivers.length} drivers (page: ${page}, limit: ${limit}, search: "${search}")`);
    res.json({ 
      drivers: drivers || [],
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages
      }
    });
  } catch (err) {
    console.error("Error fetching drivers:", err);
    res
      .status(500)
      .json({ message: "Failed to fetch drivers", error: err.message });
  }
});

/**
 * Get list of investors for notification selection
 * GET /api/notifications/admin/investors
 */
router.get("/admin/investors", async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 100, 10), 100); // Between 10-100
    const { search = "" } = req.query;
    
    let query = {};

    // If search is provided, search across investorName, phone, and email fields
    if (search && search.trim()) {
      query = {
        $or: [
          { investorName: { $regex: search.trim(), $options: "i" } },
          { phone: { $regex: search.trim(), $options: "i" } },
          { email: { $regex: search.trim(), $options: "i" } },
        ],
      };
    }

    const total = await Investor.countDocuments(query);
    const skip = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);

    const investors = await Investor.find(query)
      .select("_id investorName phone email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    console.log(`Fetched ${investors.length} investors (page: ${page}, limit: ${limit}, search: "${search}")`);
    res.json({ 
      investors: investors || [],
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages
      }
    });
  } catch (err) {
    console.error("Error fetching investors:", err);
    res
      .status(500)
      .json({ message: "Failed to fetch investors", error: err.message });
  }
});

/**
 * Admin endpoint to send notifications to specific drivers and/or investors
 * POST /api/notifications/admin/send-specific
 *
 * Body:
 * {
 *   driverIds: ['id1', 'id2'], // Array of driver IDs
 *   investorIds: ['id1', 'id2'], // Array of investor IDs
 *   title: 'Notification Title',
 *   message: 'Notification Message',
 *   link: 'optional deep link',
 *   sendType: 'now' | 'schedule',
 *   scheduledTime?: Date
 * }
 */
router.post("/admin/send-specific", async (req, res) => {
  try {
    const {
      driverIds,
      investorIds,
      title,
      message,
      link,
      sendType,
      scheduledTime,
    } = req.body || {};

    // Validate required fields
    if (
      (!driverIds || driverIds.length === 0) &&
      (!investorIds || investorIds.length === 0)
    ) {
      return res
        .status(400)
        .json({ message: "At least one driverId or investorId is required" });
    }

    if (!title && !message) {
      return res.status(400).json({ message: "title or message is required" });
    }

    if (sendType === "schedule" && !scheduledTime) {
      return res.status(400).json({
        message: 'scheduledTime is required when sendType is "schedule"',
      });
    }

    const notificationData = {
      title: title || "",
      message: message || "",
      data: {
        link: link || "",
        scheduledTime: sendType === "schedule" ? scheduledTime : undefined,
      },
    };

    if (sendType === "now") {
      const { results, errors } = await sendNotificationToSpecificUsers({
        driverIds: driverIds || [],
        investorIds: investorIds || [],
        ...notificationData,
        type: "admin_message",
      });

      res.status(200).json({
        message: "Notifications sent",
        results,
        errors: errors.length > 0 ? errors : undefined,
      });
    } else {
      // For scheduled notifications, create them but mark as scheduled
      // TODO: Implement proper scheduling with a job queue
      const { createAndEmitNotification } = await import("../lib/notify.js");
      const notes = [];

      for (const driverId of driverIds || []) {
        const note = await createAndEmitNotification({
          type: "admin_message_scheduled",
          title: notificationData.title,
          message: notificationData.message,
          data: {
            ...notificationData.data,
            scheduledFor: scheduledTime,
          },
          recipientType: "driver",
          recipientId: driverId,
        });
        notes.push(note);
      }

      for (const investorId of investorIds || []) {
        const note = await createAndEmitNotification({
          type: "admin_message_scheduled",
          title: notificationData.title,
          message: notificationData.message,
          data: {
            ...notificationData.data,
            scheduledFor: scheduledTime,
          },
          recipientType: "investor",
          recipientId: investorId,
        });
        notes.push(note);
      }

      res.status(200).json({
        message: "Notifications scheduled",
        results: notes.map((note) => ({
          notificationId: note._id,
          status: "scheduled",
          scheduledTime,
        })),
      });
    }
  } catch (err) {
    console.error("Error in admin send-specific notification:", err);
    res
      .status(500)
      .json({ message: "Failed to send notifications", error: err.message });
  }
});

/**
 * Send notification-only push to a driver by mobile number
 * POST /api/notifications/send-driver-by-mobile
 * Body:
 * {
 *   mobile: '9999999999',
 *   title: 'Title',
 *   message: 'Message',
 *   save: boolean (optional, default false)
 * }
 */
router.post("/send-driver-by-mobile", async (req, res) => {
  try {
    const { mobile, title, message, save = false } = req.body || {};
    if (!mobile) return res.status(400).json({ message: "mobile is required" });
    if (!title && !message)
      return res.status(400).json({ message: "title or message is required" });

    const normalized = String(mobile).trim();
    const driver = await Driver.findOne({ mobile: normalized }).lean();
    if (!driver)
      return res
        .status(404)
        .json({ message: "Driver not found for given mobile" });

    const tokens = await DeviceToken.find({
      userType: "driver",
      userId: String(driver._id),
    }).distinct("token");
    if (!tokens || tokens.length === 0) {
      if (save) {
        const { createAndEmitNotification } = await import("../lib/notify.js");
        await createAndEmitNotification({
          type: "mobile_only",
          title: title || "",
          message: message || "",
          data: {},
          recipientType: "driver",
          recipientId: String(driver._id),
        });
      }
      return res
        .status(200)
        .json({ message: "No device tokens found for driver", tokensFound: 0 });
    }

    const payloadTitle = String(title || "").trim();
    const payloadBody = String(message || "").trim();

    const { sendPushToTokens } = await import("../lib/firebaseAdmin.js");
    const result = await sendPushToTokens(tokens, {
      title: payloadTitle,
      body: payloadBody,
      data: undefined,
    });

    let savedNote = null;
    if (save) {
      const { createAndEmitNotification } = await import("../lib/notify.js");
      savedNote = await createAndEmitNotification({
        type: "mobile_only",
        title: payloadTitle,
        message: payloadBody,
        data: {},
        recipientType: "driver",
        recipientId: String(driver._id),
      });
    }

    return res.status(200).json({
      message: "Notification sent",
      recipientType: "driver",
      recipientId: String(driver._id),
      tokensTried: tokens.length,
      sendResult: result,
      notification: savedNote,
    });
  } catch (err) {
    console.error("Error in send-driver-by-mobile:", err);
    return res
      .status(500)
      .json({ message: "Failed to send notification", error: err.message });
  }
});

/**
 * Send notification-only push to an investor by mobile number
 * POST /api/notifications/send-investor-by-mobile
 * Body:
 * {
 *   mobile: '9999999999',
 *   title: 'Title',
 *   message: 'Message',
 *   save: boolean (optional, default false)
 * }
 */
router.post("/send-investor-by-mobile", async (req, res) => {
  try {
    const { mobile, title, message, save = false } = req.body || {};
    if (!mobile) return res.status(400).json({ message: "mobile is required" });
    if (!title && !message)
      return res.status(400).json({ message: "title or message is required" });

    const normalized = String(mobile).trim();
    const investor = await Investor.findOne({ phone: normalized }).lean();
    if (!investor)
      return res
        .status(404)
        .json({ message: "Investor not found for given mobile" });

    const tokens = await DeviceToken.find({
      userType: "investor",
      userId: String(investor._id),
    }).distinct("token");
    if (!tokens || tokens.length === 0) {
      if (save) {
        const { createAndEmitNotification } = await import("../lib/notify.js");
        await createAndEmitNotification({
          type: "mobile_only",
          title: title || "",
          message: message || "",
          data: {},
          recipientType: "investor",
          recipientId: String(investor._id),
        });
      }
      return res.status(200).json({
        message: "No device tokens found for investor",
        tokensFound: 0,
      });
    }

    const payloadTitle = String(title || "").trim();
    const payloadBody = String(message || "").trim();

    const { sendPushToTokens } = await import("../lib/firebaseAdmin.js");
    const result = await sendPushToTokens(tokens, {
      title: payloadTitle,
      body: payloadBody,
      data: undefined,
    });

    let savedNote = null;
    if (save) {
      const { createAndEmitNotification } = await import("../lib/notify.js");
      savedNote = await createAndEmitNotification({
        type: "mobile_only",
        title: payloadTitle,
        message: payloadBody,
        data: {},
        recipientType: "investor",
        recipientId: String(investor._id),
      });
    }

    return res.status(200).json({
      message: "Notification sent",
      recipientType: "investor",
      recipientId: String(investor._id),
      tokensTried: tokens.length,
      sendResult: result,
      notification: savedNote,
    });
  } catch (err) {
    console.error("Error in send-investor-by-mobile:", err);
    return res
      .status(500)
      .json({ message: "Failed to send notification", error: err.message });
  }
});

/**
 * Get notifications for a driver by mobile number
 * GET /api/notifications/by-driver-mobile?mobile=9999999999
 */
router.get("/by-driver-mobile", async (req, res) => {
  try {
    const { mobile } = req.query;
    if (!mobile)
      return res
        .status(400)
        .json({ message: "mobile query parameter is required" });

    const normalized = String(mobile).trim();
    const driver = await Driver.findOne({ mobile: normalized }).lean();
    if (!driver)
      return res
        .status(404)
        .json({ message: "Driver not found for given mobile" });

    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const result = await listNotifications({
      page,
      limit,
      driverId: String(driver._id),
    });

    if (result && result.items) {
      res.json(result);
    } else {
      res.json({
        items: [],
        pagination: { total: 0, page, limit, totalPages: 0 },
      });
    }
  } catch (err) {
    console.error("Error in by-driver-mobile:", err);
    res
      .status(500)
      .json({ message: "Failed to fetch notifications", error: err.message });
  }
});

/**
 * Get notifications for an investor by mobile number
 * GET /api/notifications/by-investor-mobile?mobile=9999999999
 */
router.get("/by-investor-mobile", async (req, res) => {
  try {
    const { mobile } = req.query;
    if (!mobile)
      return res
        .status(400)
        .json({ message: "mobile query parameter is required" });

    const normalized = String(mobile).trim();
    const investor = await Investor.findOne({ phone: normalized }).lean();
    if (!investor)
      return res
        .status(404)
        .json({ message: "Investor not found for given mobile" });

    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const result = await listNotifications({
      page,
      limit,
      investorId: String(investor._id),
    });

    if (result && result.items) {
      res.json(result);
    } else {
      res.json({
        items: [],
        pagination: { total: 0, page, limit, totalPages: 0 },
      });
    }
  } catch (err) {
    console.error("Error in by-investor-mobile:", err);
    res
      .status(500)
      .json({ message: "Failed to fetch notifications", error: err.message });
  }
});

export default router;
