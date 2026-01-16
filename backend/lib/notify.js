import Notification from "../models/notification.js";
import { getIO } from "./socket.js";
import { sendPushToTokens } from "./firebaseAdmin.js";
import DeviceToken from "../models/deviceToken.js";
import Driver from "../models/driver.js";
import Investor from "../models/investor.js";
import DriverSignup from "../models/driverSignup.js";
import InvestorSignup from "../models/investorSignup.js";

export async function createAndEmitNotification({
  type,
  title,
  message,
  data = {},
  recipientType = null,
  recipientId = null,
}) {
  try {
    // Ensure recipientId is stored as string if provided (for consistent querying)
    const normalizedRecipientId = recipientId ? String(recipientId) : null;
    // Normalize recipientType for consistent comparisons (lowercase)
    const normalizedRecipientType = recipientType ? String(recipientType).toLowerCase() : null;

    console.log("[NOTIFY] ===== CREATE NOTIFICATION =====");
    console.log(
      "[NOTIFY] Input recipientId:",
      recipientId,
      "Type:",
      typeof recipientId
    );
    console.log("[NOTIFY] Normalized recipientId:", normalizedRecipientId);
    console.log("[NOTIFY] Creating notification:", {
      type,
      title: title?.substring(0, 50),
      recipientType,
      recipientId: normalizedRecipientId,
      message: message?.substring(0, 50),
    });

    // Log the actual data being saved
    console.log("[NOTIFY] Saving to DB with:", {
      type,
      recipientType,
      recipientId: normalizedRecipientId,
      recipientIdType: typeof normalizedRecipientId,
    });

    const note = await Notification.create({
      type,
      title,
      message,
      data,
      // store normalized recipient type for consistency
      recipientType: normalizedRecipientType,
      recipientId: normalizedRecipientId,
    });
    console.log("[NOTIFY] ===== SAVED TO DB =====");
    console.log("[NOTIFY] Notification saved with ID:", note._id);
    console.log(
      "[NOTIFY] Saved RecipientType:",
      note.recipientType,
      "Type:",
      typeof note.recipientType
    );
    console.log(
      "[NOTIFY] Saved RecipientId:",
      note.recipientId,
      "Type:",
      typeof note.recipientId
    );
    console.log("[NOTIFY] Query will use:", {
      recipientType: note.recipientType,
      recipientId: note.recipientId,
    });
    console.log("[NOTIFY] Full document:", JSON.stringify(note, null, 2));
    // Emit to admin/dashboard rooms only (avoid broadcasting to all connected sockets)
    try {
      const io = getIO();
      try {
        const rooms = io.sockets.adapter.rooms;
        let adminEmittedCount = 0;
        for (const [roomName] of rooms.entries()) {
          if (roomName.startsWith('admin:') || roomName === 'admin' || roomName === 'dashboard') {
            io.to(roomName).emit('dashboard:notification', note);
            adminEmittedCount++;
          }
        }
        console.log(`Notification emitted to ${adminEmittedCount} admin dashboard listener room(s)`);
      } catch (emitErr) {
        console.warn('Error emitting admin dashboard notification:', emitErr.message);
      }
      // Also emit to a specific room if recipient is provided (e.g., 'investor:123')
      if (normalizedRecipientType && normalizedRecipientId) {
        // If this is a signup-targeted notification (e.g., 'investor_signup' / 'driver_signup'), skip per-user socket emits
        if (normalizedRecipientType.endsWith('_signup')) {
          console.log(`[NOTIFY] Signup-targeted notification for ${normalizedRecipientType}:${normalizedRecipientId} - skipping per-user socket emit`);
        } else {
          // Verify recipient exists before emitting to their room to avoid emitting to stale signup IDs
          // For drivers, handle DriverSignup ID to Driver ID conversion
          let actualUserId = normalizedRecipientId;
          let targetExists = true;
          
          try {
            if (normalizedRecipientType === 'driver') {
              // First, try to find Driver by _id
              let driver = await Driver.findById(String(normalizedRecipientId)).lean();
              
              // If not found, it might be a DriverSignup ID - try to find Driver by mobile
              if (!driver) {
                const driverSignup = await DriverSignup.findById(String(normalizedRecipientId)).lean();
                if (driverSignup && driverSignup.mobile) {
                  driver = await Driver.findOne({ mobile: driverSignup.mobile }).lean();
                  if (driver) {
                    actualUserId = String(driver._id);
                  }
                }
              } else {
                actualUserId = String(driver._id);
              }
              
              targetExists = !!driver;
            } else if (normalizedRecipientType === 'investor') {
              // First, try to find Investor by _id
              let investor = await Investor.findById(String(normalizedRecipientId)).lean();
              
              // If not found, it might be an InvestorSignup ID - try to find Investor by phone
              if (!investor) {
                const investorSignup = await InvestorSignup.findById(String(normalizedRecipientId)).lean();
                if (investorSignup && investorSignup.phone) {
                  investor = await Investor.findOne({ phone: investorSignup.phone }).lean();
                  if (investor) {
                    actualUserId = String(investor._id);
                  }
                }
              } else {
                actualUserId = String(investor._id);
              }
              
              targetExists = !!investor;
            }
          } catch (ve) {
            console.warn('[NOTIFY] Error verifying recipient existence before socket emit:', ve.message);
            targetExists = false;
          }

          if (targetExists) {
            // Emit to both the original ID (for backward compatibility) and the actual Driver ID
            io.to(`${normalizedRecipientType}:${normalizedRecipientId}`).emit(
              "dashboard:notification",
              note
            );
            if (actualUserId !== normalizedRecipientId) {
              io.to(`${normalizedRecipientType}:${actualUserId}`).emit(
                "dashboard:notification",
                note
              );
            }
            console.log(
              `Notification also emitted to room: ${normalizedRecipientType}:${normalizedRecipientId}${actualUserId !== normalizedRecipientId ? ` and ${normalizedRecipientType}:${actualUserId}` : ''}`
            );
          } else {
            console.warn(`[NOTIFY] Recipient not found: ${normalizedRecipientType}:${normalizedRecipientId} - skipping socket emit`);
          }
        }
      }
    } catch (e) {
      // Socket not initialized yet; ignore emit but proceed to FCM
      console.warn("Socket emit skipped:", e.message);
    }

    // Try sending push notifications via FCM (run regardless of socket status)
    try {
      let tokens = [];
      // Only send FCM pushes when a recipientType is provided.
      // If both recipientType and recipientId are provided -> send to that specific user's tokens.
      // If recipientType is provided but recipientId is null -> broadcast to all users of that type.
      if (normalizedRecipientType && normalizedRecipientId) {
        // If this is a signup-targeted notification (e.g., 'driver_signup' or 'investor_signup'), skip FCM pushes
        if (normalizedRecipientType.endsWith('_signup')) {
          console.log(`[NOTIFY] Signup-targeted notification for ${normalizedRecipientType}:${normalizedRecipientId} - skipping FCM push`);
          tokens = [];
        } else {
          // Verify that the target user exists before sending push to avoid cross-app or stale tokens
          // For drivers, we need to handle the case where recipientId might be a DriverSignup ID
          // Device tokens are registered with Driver._id, not DriverSignup._id
          let actualUserId = normalizedRecipientId;
          let targetExists = true;
          
          try {
            if (normalizedRecipientType === 'driver') {
              // First, try to find Driver by _id
              let driver = await Driver.findById(String(normalizedRecipientId)).lean();
              
              // If not found, it might be a DriverSignup ID - try to find Driver by mobile
              if (!driver) {
                console.log(`[NOTIFY] Driver not found by _id, checking if it's a DriverSignup ID: ${normalizedRecipientId}`);
                const driverSignup = await DriverSignup.findById(String(normalizedRecipientId)).lean();
                if (driverSignup && driverSignup.mobile) {
                  console.log(`[NOTIFY] Found DriverSignup, looking up Driver by mobile: ${driverSignup.mobile}`);
                  driver = await Driver.findOne({ mobile: driverSignup.mobile }).lean();
                  if (driver) {
                    actualUserId = String(driver._id);
                    console.log(`[NOTIFY] Found Driver by mobile, using Driver._id: ${actualUserId}`);
                  }
                }
              } else {
                actualUserId = String(driver._id);
              }
              
              targetExists = !!driver;
            } else if (normalizedRecipientType === 'investor') {
              // First, try to find Investor by _id
              let investor = await Investor.findById(String(normalizedRecipientId)).lean();
              
              // If not found, it might be an InvestorSignup ID - try to find Investor by phone
              if (!investor) {
                console.log(`[NOTIFY] Investor not found by _id, checking if it's an InvestorSignup ID: ${normalizedRecipientId}`);
                const investorSignup = await InvestorSignup.findById(String(normalizedRecipientId)).lean();
                if (investorSignup && investorSignup.phone) {
                  console.log(`[NOTIFY] Found InvestorSignup, looking up Investor by phone: ${investorSignup.phone}`);
                  investor = await Investor.findOne({ phone: investorSignup.phone }).lean();
                  if (investor) {
                    actualUserId = String(investor._id);
                    console.log(`[NOTIFY] Found Investor by phone, using Investor._id: ${actualUserId}`);
                  }
                }
              } else {
                actualUserId = String(investor._id);
              }
              
              targetExists = !!investor;
            }
          } catch (ve) {
            console.warn('[NOTIFY] Error verifying recipient existence:', ve.message);
            targetExists = false;
          }

          if (!targetExists) {
            console.warn(`[NOTIFY] Recipient not found: ${normalizedRecipientType}:${normalizedRecipientId} - skipping FCM`);
            tokens = [];
          } else {
            console.log("[NOTIFY] Searching for device token documents with criteria:", {
              userType: normalizedRecipientType,
              userId: actualUserId,
              originalRecipientId: normalizedRecipientId,
            });
            const tokenDocs = await DeviceToken.find({
              userType: normalizedRecipientType,
              userId: actualUserId,
            }).lean();
            tokens = tokenDocs.map(d => d.token).filter(Boolean);
            console.log(
              `[NOTIFY] Found ${tokens.length} device token(s) for ${normalizedRecipientType}:${actualUserId} (original: ${normalizedRecipientId})`,
              tokenDocs.map(d => ({ token: d.token ? d.token.substring(0,12) + '...' : null, userType: d.userType, userId: d.userId }))
            );
          }
        }
      } else if (normalizedRecipientType) {
        // Broadcast to all users of this recipientType only
        // If this is a signup-targeted broadcast (unlikely), skip FCM
        if (normalizedRecipientType.endsWith('_signup')) {
          console.log(`[NOTIFY] Signup-targeted broadcast for ${normalizedRecipientType} - skipping FCM push`);
          tokens = [];
        } else {
          console.log("[NOTIFY] Broadcast to app type:", normalizedRecipientType);
          const tokenDocs = await DeviceToken.find({ userType: normalizedRecipientType }).lean();
          tokens = tokenDocs.map(d => d.token).filter(Boolean);
          console.log(`[NOTIFY] Found ${tokens.length} device token(s) for ${normalizedRecipientType} (broadcast)`);
        }
      } else {
        // No recipientType specified: do not send FCM to all devices to avoid cross-app delivery
        console.log("[NOTIFY] No recipientType specified - skipping FCM push to all devices (only emitting to dashboard)");
        tokens = [];
      }

      if (tokens && tokens.length) {
        const payload = {
          title: title || "Notification",
          body: message || "",
          data: { noteId: note._id.toString(), ...data },
        };
        console.log(
          `[NOTIFY] Sending FCM notification to ${tokens.length} device(s)`
        );
        const result = await sendPushToTokens(tokens, payload);
        console.log("[NOTIFY] FCM send result:", result);

        // Clean up invalid tokens if the send result reports them
        if (result && result.invalidTokens && result.invalidTokens.length > 0) {
          try {
            const cleanupQuery = { token: { $in: result.invalidTokens }, userType: normalizedRecipientType };
            if (normalizedRecipientId) cleanupQuery.userId = String(normalizedRecipientId);
            const deleteResult = await DeviceToken.deleteMany(cleanupQuery);
            console.log(`[NOTIFY] Cleaned up ${deleteResult.deletedCount} invalid tokens for ${normalizedRecipientType}`);
          } catch (cleanupErr) {
            console.warn('[NOTIFY] Failed to cleanup invalid tokens:', cleanupErr.message);
          }
        }
      } else {
        console.log("[NOTIFY] ⚠️ No device tokens found to send FCM to");
      }
    } catch (pe) {
      console.warn("FCM send failed:", pe.message);
    }
    return note;
  } catch (err) {
    console.error("Failed to create notification:", err);
    throw err;
  }
}

export async function listNotifications({
  page = 1,
  limit = 20,
  driverId = null,
  investorId = null,
  recipientType = null,
  recipientId = null,
} = {}) {
  const skip = (page - 1) * limit;

  // Normalize recipientType for consistency
  const normalizedRecipientType = recipientType ? String(recipientType).toLowerCase() : null;
  // Build query based on recipient filters
  let query = {};

  // If specific recipient filters are provided, use them
  if (driverId) {
    // Normalize driverId to string for consistent comparison
    const normalizedDriverId = String(driverId);
    console.log(
      `[NOTIFY] Fetching driver notifications for: ${normalizedDriverId}`
    );
    // For drivers: show their specific notifications + broadcast to all drivers only (NO global notifications)
    query = {
      $or: [
        { recipientType: "driver", recipientId: normalizedDriverId }, // Specific to this driver
        { recipientType: "driver", recipientId: null }, // Broadcast to all drivers
      ],
    };
  } else if (investorId) {
    // Normalize investorId to string for consistent comparison
    const normalizedInvestorId = String(investorId);
    console.log(
      `[NOTIFY] Fetching investor notifications for: ${normalizedInvestorId}`
    );
    // For investors: show their specific notifications + broadcast to all investors only (NO global notifications)
    query = {
      $or: [
        { recipientType: "investor", recipientId: normalizedInvestorId }, // Specific to this investor
        { recipientType: "investor", recipientId: null }, // Broadcast to all investors
      ],
    };
    console.log("[NOTIFY] Query for investor:", JSON.stringify(query));
  } else if (normalizedRecipientType && recipientId) {
    // Normalize recipientId to string for consistent comparison
    const normalizedRecipientId = String(recipientId);
    console.log(
      `[NOTIFY] Fetching notifications for type: ${normalizedRecipientType}, id: ${normalizedRecipientId}`
    );
    // For specific recipient type/id: show their notifications + broadcast to that type only (NO global notifications)
    query = {
      $or: [
        { recipientType: normalizedRecipientType, recipientId: normalizedRecipientId }, // Specific to this user
        { recipientType: normalizedRecipientType, recipientId: null }, // Broadcast to all users of this type
      ],
    };
  } else {
    // No specific recipient - show all notifications (for admins)
    console.log("[NOTIFY] Fetching all notifications (admin view)");
    // Show all notifications regardless of recipientType/recipientId
    query = {};
  }

  console.log("[NOTIFY] ===== LIST NOTIFICATIONS =====");
  console.log("[NOTIFY] Params:", {
    page,
    limit,
    driverId,
    investorId,
    recipientType,
    recipientId,
  });
  console.log("[NOTIFY] Query:", JSON.stringify(query));
  const total = await Notification.countDocuments(query);
  const items = await Notification.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
  console.log(`[NOTIFY] Found ${items.length} notifications (total: ${total})`);
  if (items.length > 0) {
    console.log(
      "[NOTIFY] First notification:",
      JSON.stringify(items[0], null, 2)
    );
  } else {
    console.log(
      "[NOTIFY] No notifications found. Checking all notifications in DB:"
    );
    const allCount = await Notification.countDocuments({});
    console.log("[NOTIFY] Total notifications in DB:", allCount);

    // Get all notifications and show them for debugging
    if (allCount > 0) {
      const allNotifs = await Notification.find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();
      console.log("[NOTIFY] Sample notifications from DB:");
      allNotifs.forEach((n, idx) => {
        console.log(`[NOTIFY] Sample ${idx + 1}:`, {
          type: n.type,
          recipientType: n.recipientType,
          recipientId: n.recipientId,
          recipientIdType: typeof n.recipientId,
          title: n.title?.substring(0, 50),
        });
      });
    }
  }
  return {
    items,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

export async function markAsRead(id) {
  return Notification.findByIdAndUpdate(
    id,
    { read: true },
    { new: true }
  ).lean();
}

export async function markAllAsRead({
  recipientType = null,
  recipientId = null,
} = {}) {
  // Normalize recipientType
  const normalizedRecipientType = recipientType ? String(recipientType).toLowerCase() : null;

  // Build query similar to listNotifications: specific recipient + broadcast to type only (NO global notifications)
  // IMPORTANT: Only mark notifications that are currently unread (read: false)
  let query = { read: false };
  
  if (normalizedRecipientType && recipientId) {
    // Normalize recipientId to string for consistent comparison
    const normalizedRecipientId = String(recipientId);
    query = {
      read: false,
      $or: [
        { recipientType: normalizedRecipientType, recipientId: normalizedRecipientId }, // Specific to this user
        { recipientType: normalizedRecipientType, recipientId: null }, // Broadcast to all users of this type
      ],
    };
  } else if (normalizedRecipientType && !recipientId) {
    query = {
      read: false,
      recipientType: normalizedRecipientType, // All notifications for this type (both specific and broadcast, but not global)
    };
  } else {
    // No recipient type specified - mark ALL unread notifications (for admin view)
    query = { read: false };
  }
  
  console.log(`[NOTIFY] markAllAsRead query:`, JSON.stringify(query, null, 2));
  const res = await Notification.updateMany(query, { $set: { read: true } });
  console.log(`[NOTIFY] markAllAsRead result:`, res);
  return res;
}

export async function countUnread({
  recipientType = null,
  recipientId = null,
} = {}) {
  // Normalize recipientType
  const normalizedRecipientType = recipientType ? String(recipientType).toLowerCase() : null;

  // IMPORTANT: Use read: false (not $ne: true) to match markAllAsRead query
  let query = { read: false };
  if (normalizedRecipientType && recipientId) {
    // Normalize recipientId to string for consistent comparison
    const normalizedRecipientId = String(recipientId);
    query = {
      read: false,
      $or: [
        { recipientType: normalizedRecipientType, recipientId: normalizedRecipientId }, // Specific to this user
        { recipientType: normalizedRecipientType, recipientId: null }, // Broadcast to all users of this type
      ],
    };
  } else if (normalizedRecipientType) {
    query = {
      read: false,
      recipientType: normalizedRecipientType, // All notifications for this type (both specific and broadcast, but not global)
    };
  } else {
    // No recipient type specified - count ALL unread (for admin)
    query = { read: false };
  }
  return Notification.countDocuments(query);
}

/**
 * Send notification to specific users (drivers or investors) by their IDs
 * @param {Object} params
 * @param {Array<String>} params.driverIds - Array of driver IDs
 * @param {Array<String>} params.investorIds - Array of investor IDs
 * @param {String} params.title - Notification title
 * @param {String} params.message - Notification message
 * @param {Object} params.data - Additional data (e.g., link)
 * @param {String} params.type - Notification type (default: 'admin_message')
 */
export async function sendNotificationToSpecificUsers({
  driverIds = [],
  investorIds = [],
  title,
  message,
  data = {},
  type = "admin_message",
}) {
  try {
    if (
      (!driverIds || driverIds.length === 0) &&
      (!investorIds || investorIds.length === 0)
    ) {
      throw new Error("At least one driverId or investorId is required");
    }

    if (!title && !message) {
      throw new Error("title or message is required");
    }

    const results = [];
    const errors = [];

    // Send to specific drivers
    if (driverIds && driverIds.length > 0) {
      for (const driverId of driverIds) {
        try {
          const note = await Notification.create({
            type,
            title: title || "",
            message: message || "",
            data,
            recipientType: "driver",
            recipientId: driverId,
          });

          console.log(`Notification created for driver ${driverId}:`, {
            type,
            title,
            id: note._id,
          });

          try {
            const io = getIO();
            // Emit to admin/dashboard rooms only
            try {
              const rooms = io.sockets.adapter.rooms;
              let adminEmittedCount = 0;
              for (const [roomName] of rooms.entries()) {
                if (roomName.startsWith('admin:') || roomName === 'admin' || roomName === 'dashboard') {
                  io.to(roomName).emit('dashboard:notification', note);
                  adminEmittedCount++;
                }
              }
              console.log(`Notification emitted to ${adminEmittedCount} admin dashboard listener room(s)`);
            } catch (emitErr) {
              console.warn('Error emitting admin dashboard notification:', emitErr.message);
            }
            // Emit to specific driver room
            io.to(`driver:${driverId}`).emit("dashboard:notification", note);
          } catch (e) {
            console.warn("Socket emit skipped:", e.message);
          }

          // Send push notification via FCM (run even if socket errors)
          // Handle case where driverId might be a DriverSignup ID
          try {
            let actualDriverId = String(driverId);
            // Check if driverId is a Driver ID
            let driver = await Driver.findById(String(driverId)).lean();
            
            // If not found, it might be a DriverSignup ID - try to find Driver by mobile
            if (!driver) {
              const driverSignup = await DriverSignup.findById(String(driverId)).lean();
              if (driverSignup && driverSignup.mobile) {
                driver = await Driver.findOne({ mobile: driverSignup.mobile }).lean();
                if (driver) {
                  actualDriverId = String(driver._id);
                  console.log(`[NOTIFY] Converted DriverSignup ID ${driverId} to Driver ID ${actualDriverId}`);
                }
              }
            } else {
              actualDriverId = String(driver._id);
            }
            
            const tokenDocs = await DeviceToken.find({
              userType: "driver",
              userId: actualDriverId,
            }).lean();
            const tokens = tokenDocs.map(d => d.token).filter(Boolean);
            console.log(`[NOTIFY] driver ${driverId} (actual: ${actualDriverId}) token docs:`, tokenDocs.map(d => ({ token: d.token ? d.token.substring(0,12) + '...' : null, userId: d.userId })));
            if (tokens && tokens.length) {
              const payload = {
                title: title || "Notification",
                body: message || "",
                data: {
                  noteId: note._id.toString(),
                  ...data,
                },
              };
              const result = await sendPushToTokens(tokens, payload);
              console.log(`FCM send result for driver ${driverId}:`, result);

              // Clean up invalid tokens for drivers as well (same as investors)
              if (result && result.invalidTokens && result.invalidTokens.length > 0) {
                try {
                  await DeviceToken.deleteMany({
                    token: { $in: result.invalidTokens },
                    userType: "driver",
                    userId: actualDriverId,
                  });
                  console.log(`🧹 Cleaned up ${result.invalidTokens.length} invalid tokens for driver ${driverId} (actual: ${actualDriverId})`);
                } catch (cleanupErr) {
                  console.warn("Failed to cleanup invalid tokens for driver:", cleanupErr.message);
                }
              }
            }
          } catch (pe) {
            console.warn(
              `FCM send failed for driver ${driverId}:`,
              pe.message
            );
          }

          results.push({
            recipientType: "driver",
            recipientId: driverId,
            notificationId: note._id,
          });
        } catch (err) {
          console.error(
            `Error sending notification to driver ${driverId}:`,
            err
          );
          errors.push({
            recipientType: "driver",
            recipientId: driverId,
            error: err.message,
          });
        }
      }
    }

    // Send to specific investors
    if (investorIds && investorIds.length > 0) {
      for (const investorId of investorIds) {
        try {
          const note = await Notification.create({
            type,
            title: title || "",
            message: message || "",
            data,
            recipientType: "investor",
            recipientId: investorId,
          });

          console.log(`Notification created for investor ${investorId}:`, {
            type,
            title,
            id: note._id,
          });

          try {
            const io = getIO();
            // Emit to admin/dashboard rooms only
            try {
              const rooms = io.sockets.adapter.rooms;
              let adminEmittedCount = 0;
              for (const [roomName] of rooms.entries()) {
                if (roomName.startsWith('admin:') || roomName === 'admin' || roomName === 'dashboard') {
                  io.to(roomName).emit('dashboard:notification', note);
                  adminEmittedCount++;
                }
              }
              console.log(`Notification emitted to ${adminEmittedCount} admin dashboard listener room(s)`);
            } catch (emitErr) {
              console.warn('Error emitting admin dashboard notification:', emitErr.message);
            }
            // Emit to specific investor room
            io.to(`investor:${investorId}`).emit(
              "dashboard:notification",
              note
            );
          } catch (e) {
            console.warn("Socket emit skipped:", e.message);
          }

          // Send Firebase push notification to mobile app - PRIMARY METHOD (run regardless of socket)
          // Handle case where investorId might be an InvestorSignup ID
          try {
            let actualInvestorId = String(investorId);
            // Check if investorId is an Investor ID
            let investor = await Investor.findById(String(investorId)).lean();
            
            // If not found, it might be an InvestorSignup ID - try to find Investor by phone
            if (!investor) {
              const investorSignup = await InvestorSignup.findById(String(investorId)).lean();
              if (investorSignup && investorSignup.phone) {
                investor = await Investor.findOne({ phone: investorSignup.phone }).lean();
                if (investor) {
                  actualInvestorId = String(investor._id);
                  console.log(`[NOTIFY] Converted InvestorSignup ID ${investorId} to Investor ID ${actualInvestorId}`);
                }
              }
            } else {
              actualInvestorId = String(investor._id);
            }
            
            const tokenDocs = await DeviceToken.find({
              userType: "investor",
              userId: actualInvestorId,
            }).lean();
            const tokens = tokenDocs.map(d => d.token).filter(Boolean);
            console.log(
              `📱 Found ${tokens.length} device token(s) for investor ${investorId} (actual: ${actualInvestorId})`,
              tokenDocs.map(d => ({ token: d.token ? d.token.substring(0,12) + '...' : null, userId: d.userId }))
            );

            if (tokens && tokens.length) {
              const payload = {
                title: title || "Notification",
                body: message || "",
                data: {
                  noteId: note._id.toString(),
                  type: type || "admin_message",
                  ...data,
                },
              };
              const result = await sendPushToTokens(tokens, payload);
              console.log(
                `📱 Firebase push notification sent to investor ${investorId}:`,
                {
                  successCount: result.successCount,
                  failureCount: result.failureCount,
                  totalTokens: tokens.length,
                }
              );

              // Clean up invalid tokens if any
              if (result.invalidTokens && result.invalidTokens.length > 0) {
                try {
                  await DeviceToken.deleteMany({
                    token: { $in: result.invalidTokens },
                    userType: "investor",
                    userId: actualInvestorId,
                  });
                  console.log(
                    `🧹 Cleaned up ${result.invalidTokens.length} invalid tokens for investor ${investorId} (actual: ${actualInvestorId})`
                  );
                } catch (cleanupErr) {
                  console.warn(
                    "Failed to cleanup invalid tokens:",
                    cleanupErr.message
                  );
                }
              }
            } else {
              console.warn(
                `⚠️ No device tokens found for investor ${investorId} - notification saved but not pushed to mobile app`
              );
            }
          } catch (pe) {
            console.error(
              `❌ Firebase push notification failed for investor ${investorId}:`,
              pe.message
            );
            console.error("Error details:", pe);
          }

          results.push({
            recipientType: "investor",
            recipientId: investorId,
            notificationId: note._id,
          });
        } catch (err) {
          console.error(
            `Error sending notification to investor ${investorId}:`,
            err
          );
          errors.push({
            recipientType: "investor",
            recipientId: investorId,
            error: err.message,
          });
        }
      }
    }

    return { results, errors };
  } catch (err) {
    console.error("Failed to send notifications to specific users:", err);
    throw err;
  }
}

/**
 * Send notification to all users of a specific app type (driver or investor)
 * @param {Object} params
 * @param {String} params.appType - 'driver' or 'investor'
 * @param {String} params.title - Notification title
 * @param {String} params.message - Notification message
 * @param {Object} params.data - Additional data (e.g., link)
 * @param {String} params.type - Notification type (default: 'admin_broadcast')
 */
export async function sendNotificationToAppType({
  appType,
  title,
  message,
  data = {},
  type = "admin_broadcast",
}) {
  try {
    if (!appType || !["driver", "investor"].includes(appType)) {
      throw new Error('appType must be "driver" or "investor"');
    }

    if (!title && !message) {
      throw new Error("title or message is required");
    }

    // Create notification with recipientType set to appType but no specific recipientId
    // This means it's for all users of that type
    const note = await Notification.create({
      type,
      title: title || "",
      message: message || "",
      data,
      recipientType: appType,
      recipientId: null, // null means all users of this type
    });

    console.log(`Notification created for all ${appType}s:`, {
      type,
      title,
      id: note._id,
    });

    try {
      const io = getIO();
      // Emit to admin/dashboard rooms only (admins should receive broadcasts about app-wide events)
      try {
        const rooms = io.sockets.adapter.rooms;
        let adminEmittedCount = 0;
        for (const [roomName] of rooms.entries()) {
          if (roomName.startsWith('admin:') || roomName === 'admin' || roomName === 'dashboard') {
            io.to(roomName).emit('dashboard:notification', note);
            adminEmittedCount++;
          }
        }
        console.log(`Notification emitted to ${adminEmittedCount} admin dashboard listener room(s)`);
      } catch (emitErr) {
        console.warn('Error emitting admin dashboard notification:', emitErr.message);
      }

      // Emit to all users of this app type
      // Get all rooms and emit to those matching the app type pattern
      try {
        const rooms = io.sockets.adapter.rooms;
        let emittedCount = 0;

        // Iterate through all rooms and emit to those matching the pattern
        for (const [roomName] of rooms.entries()) {
          // Skip the default socket.id rooms (these are individual socket IDs)
          // Only process named rooms that match our pattern
          if (roomName.startsWith(`${appType}:`)) {
            io.to(roomName).emit("dashboard:notification", note);
            emittedCount++;
          }
        }

        console.log(
          `Notification emitted to ${emittedCount} ${appType} room(s)`
        );
      } catch (socketErr) {
        console.warn("Error emitting to socket rooms:", socketErr.message);
      }

      // Send Firebase push notifications to mobile apps - PRIMARY METHOD
      // This is the main way notifications are delivered to mobile apps
      try {
        const tokens = await DeviceToken.find({ userType: appType }).distinct(
          "token"
        );
        console.log(
          `📱 Found ${tokens.length} device token(s) for ${appType} users - sending via Firebase`
        );

        if (tokens && tokens.length) {
          const payload = {
            title: title || "Notification",
            body: message || "",
            data: {
              noteId: note._id.toString(),
              appType,
              type: type || "admin_broadcast",
              ...data,
            },
          };

          // Send in batches of 500 (FCM limit)
          const batchSize = 500;
          let successCount = 0;
          let failureCount = 0;
          const invalidTokensToRemove = [];

          for (let i = 0; i < tokens.length; i += batchSize) {
            const batch = tokens.slice(i, i + batchSize);
            const result = await sendPushToTokens(batch, payload);
            successCount += result.successCount || 0;
            failureCount += result.failureCount || 0;

            // Collect invalid tokens for cleanup
            if (result.invalidTokens && result.invalidTokens.length > 0) {
              invalidTokensToRemove.push(...result.invalidTokens);
            }
          }

          // Clean up invalid tokens from database
          if (invalidTokensToRemove.length > 0) {
            try {
              const deleteResult = await DeviceToken.deleteMany({
                token: { $in: invalidTokensToRemove },
                userType: appType,
              });
              console.log(
                `🧹 Cleaned up ${deleteResult.deletedCount} invalid device tokens for ${appType}`
              );
            } catch (cleanupErr) {
              console.warn(
                "Failed to cleanup invalid tokens:",
                cleanupErr.message
              );
            }
          }

          console.log(`📱 Firebase push notification result for ${appType}:`, {
            successCount,
            failureCount,
            totalTokens: tokens.length,
            invalidTokensRemoved: invalidTokensToRemove.length,
          });
        } else {
          console.warn(
            `⚠️ No device tokens found for ${appType} users - notification saved but not pushed to mobile apps`
          );
        }
      } catch (pe) {
        console.error(
          `❌ Firebase push notification failed for ${appType}:`,
          pe.message
        );
        console.error("Error details:", pe);
        // Don't throw - notification is still saved in database
      }
    } catch (e) {
      console.warn("Socket emit skipped:", e.message);
    }

    return note;
  } catch (err) {
    console.error("Failed to send notification to app type:", err);
    throw err;
  }
}
