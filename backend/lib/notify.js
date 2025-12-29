import Notification from '../models/notification.js';
import { getIO } from './socket.js';
import { sendPushToTokens } from './firebaseAdmin.js';
import DeviceToken from '../models/deviceToken.js';

export async function createAndEmitNotification({ type, title, message, data = {}, recipientType = null, recipientId = null }) {
  try {
    const note = await Notification.create({ type, title, message, data, recipientType, recipientId });
    console.log('Notification created:', { type, title, recipientType, recipientId, id: note._id });
    try {
      const io = getIO();
      // Emit globally for dashboard listeners (all admins will receive this)
      io.emit('dashboard:notification', note);
      console.log('Notification emitted globally to all dashboard listeners');
      // Also emit to a specific room if recipient is provided (e.g., 'investor:123')
      if (recipientType && recipientId) {
        io.to(`${recipientType}:${recipientId}`).emit('dashboard:notification', note);
        console.log(`Notification also emitted to room: ${recipientType}:${recipientId}`);
      }

      // Try sending push notifications via FCM
      try {
        let tokens = [];
        if (recipientType && recipientId) {
          tokens = await DeviceToken.find({ userType: recipientType, userId: String(recipientId) }).distinct('token');
        } else {
          tokens = await DeviceToken.find({}).distinct('token');
        }

        if (tokens && tokens.length) {
          const payload = { title: title || 'Notification', body: message || '', data: { noteId: note._id.toString(), ...data } };
          const result = await sendPushToTokens(tokens, payload);
          console.log('FCM send result:', result);
        } else {
          console.log('No device tokens to send FCM to');
        }
      } catch (pe) {
        console.warn('FCM send failed:', pe.message);
      }

    } catch (e) {
      // Socket not initialized yet; ignore emit
      console.warn('Socket emit skipped:', e.message);
    }
    return note;
  } catch (err) {
    console.error('Failed to create notification:', err);
    throw err;
  }
}

export async function listNotifications({ page = 1, limit = 20, driverId = null, investorId = null, recipientType = null, recipientId = null } = {}) {
  const skip = (page - 1) * limit;

  // Build query based on recipient filters
  let query = {};
  
  // If specific recipient filters are provided, use them
  if (driverId) {
    // For drivers: show their specific notifications + global notifications
    query = {
      $or: [
        { recipientType: 'driver', recipientId: driverId },
        { recipientType: null, recipientId: null }
      ]
    };
  } else if (investorId) {
    // For investors: show their specific notifications + global notifications
    query = {
      $or: [
        { recipientType: 'investor', recipientId: investorId },
        { recipientType: null, recipientId: null }
      ]
    };
  } else if (recipientType && recipientId) {
    // For specific recipient type/id: show their notifications + global notifications
    query = {
      $or: [
        { recipientType, recipientId },
        { recipientType: null, recipientId: null }
      ]
    };
  } else {
    // No specific recipient - show all notifications (for admins)
    // Show all notifications regardless of recipientType/recipientId
    query = {};
  }

  console.log('listNotifications query:', JSON.stringify(query));
  const total = await Notification.countDocuments(query);
  const items = await Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
  console.log(`listNotifications found ${items.length} notifications (total: ${total})`);
  return { items, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
}

export async function markAsRead(id) {
  return Notification.findByIdAndUpdate(id, { read: true }, { new: true }).lean();
}

export async function markAllAsRead({ recipientType = null, recipientId = null } = {}) {
  // Build query similar to listNotifications: specific recipient + global notifications
  let query = {};
  if (recipientType && recipientId) {
    query = {
      $or: [
        { recipientType, recipientId },
        { recipientType: null, recipientId: null }
      ]
    };
  } else if (recipientType) {
    query = {
      $or: [
        { recipientType },
        { recipientType: null }
      ]
    };
  } else {
    query = {}; // mark all notifications
  }
  const res = await Notification.updateMany(query, { $set: { read: true } });
  return res;
}

export async function countUnread({ recipientType = null, recipientId = null } = {}) {
  let query = { read: { $ne: true } };
  if (recipientType && recipientId) {
    query = {
      ...query,
      $or: [
        { recipientType, recipientId },
        { recipientType: null, recipientId: null }
      ]
    };
  } else if (recipientType) {
    query = {
      ...query,
      $or: [
        { recipientType },
        { recipientType: null }
      ]
    };
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
export async function sendNotificationToSpecificUsers({ driverIds = [], investorIds = [], title, message, data = {}, type = 'admin_message' }) {
  try {
    if ((!driverIds || driverIds.length === 0) && (!investorIds || investorIds.length === 0)) {
      throw new Error('At least one driverId or investorId is required');
    }

    if (!title && !message) {
      throw new Error('title or message is required');
    }

    const results = [];
    const errors = [];

    // Send to specific drivers
    if (driverIds && driverIds.length > 0) {
      for (const driverId of driverIds) {
        try {
          const note = await Notification.create({
            type,
            title: title || '',
            message: message || '',
            data,
            recipientType: 'driver',
            recipientId: driverId
          });

          console.log(`Notification created for driver ${driverId}:`, { type, title, id: note._id });

          try {
            const io = getIO();
            // Emit globally for dashboard listeners
            io.emit('dashboard:notification', note);
            // Emit to specific driver room
            io.to(`driver:${driverId}`).emit('dashboard:notification', note);

            // Send push notification via FCM
            try {
              const tokens = await DeviceToken.find({ userType: 'driver', userId: String(driverId) }).distinct('token');
              if (tokens && tokens.length) {
                const payload = {
                  title: title || 'Notification',
                  body: message || '',
                  data: {
                    noteId: note._id.toString(),
                    ...data
                  }
                };
                const result = await sendPushToTokens(tokens, payload);
                console.log(`FCM send result for driver ${driverId}:`, result);
              }
            } catch (pe) {
              console.warn(`FCM send failed for driver ${driverId}:`, pe.message);
            }

            results.push({ recipientType: 'driver', recipientId: driverId, notificationId: note._id });
          } catch (e) {
            console.warn('Socket emit skipped:', e.message);
            results.push({ recipientType: 'driver', recipientId: driverId, notificationId: note._id });
          }
        } catch (err) {
          console.error(`Error sending notification to driver ${driverId}:`, err);
          errors.push({ recipientType: 'driver', recipientId: driverId, error: err.message });
        }
      }
    }

    // Send to specific investors
    if (investorIds && investorIds.length > 0) {
      for (const investorId of investorIds) {
        try {
          const note = await Notification.create({
            type,
            title: title || '',
            message: message || '',
            data,
            recipientType: 'investor',
            recipientId: investorId
          });

          console.log(`Notification created for investor ${investorId}:`, { type, title, id: note._id });

          try {
            const io = getIO();
            // Emit globally for dashboard listeners
            io.emit('dashboard:notification', note);
            // Emit to specific investor room
            io.to(`investor:${investorId}`).emit('dashboard:notification', note);

            // Send Firebase push notification to mobile app - PRIMARY METHOD
            try {
              const tokens = await DeviceToken.find({ userType: 'investor', userId: String(investorId) }).distinct('token');
              console.log(`📱 Found ${tokens.length} device token(s) for investor ${investorId}`);
              
              if (tokens && tokens.length) {
                const payload = {
                  title: title || 'Notification',
                  body: message || '',
                  data: {
                    noteId: note._id.toString(),
                    type: type || 'admin_message',
                    ...data
                  }
                };
                const result = await sendPushToTokens(tokens, payload);
                console.log(`📱 Firebase push notification sent to investor ${investorId}:`, {
                  successCount: result.successCount,
                  failureCount: result.failureCount,
                  totalTokens: tokens.length
                });
                
                // Clean up invalid tokens if any
                if (result.invalidTokens && result.invalidTokens.length > 0) {
                  try {
                    await DeviceToken.deleteMany({ 
                      token: { $in: result.invalidTokens },
                      userType: 'investor',
                      userId: String(investorId)
                    });
                    console.log(`🧹 Cleaned up ${result.invalidTokens.length} invalid tokens for investor ${investorId}`);
                  } catch (cleanupErr) {
                    console.warn('Failed to cleanup invalid tokens:', cleanupErr.message);
                  }
                }
              } else {
                console.warn(`⚠️ No device tokens found for investor ${investorId} - notification saved but not pushed to mobile app`);
              }
            } catch (pe) {
              console.error(`❌ Firebase push notification failed for investor ${investorId}:`, pe.message);
              console.error('Error details:', pe);
            }

            results.push({ recipientType: 'investor', recipientId: investorId, notificationId: note._id });
          } catch (e) {
            console.warn('Socket emit skipped:', e.message);
            results.push({ recipientType: 'investor', recipientId: investorId, notificationId: note._id });
          }
        } catch (err) {
          console.error(`Error sending notification to investor ${investorId}:`, err);
          errors.push({ recipientType: 'investor', recipientId: investorId, error: err.message });
        }
      }
    }

    return { results, errors };
  } catch (err) {
    console.error('Failed to send notifications to specific users:', err);
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
export async function sendNotificationToAppType({ appType, title, message, data = {}, type = 'admin_broadcast' }) {
  try {
    if (!appType || !['driver', 'investor'].includes(appType)) {
      throw new Error('appType must be "driver" or "investor"');
    }

    if (!title && !message) {
      throw new Error('title or message is required');
    }

    // Create notification with recipientType set to appType but no specific recipientId
    // This means it's for all users of that type
    const note = await Notification.create({
      type,
      title: title || '',
      message: message || '',
      data,
      recipientType: appType,
      recipientId: null // null means all users of this type
    });

    console.log(`Notification created for all ${appType}s:`, { type, title, id: note._id });

    try {
      const io = getIO();
      // Emit globally for dashboard listeners (all admins will receive this)
      io.emit('dashboard:notification', note);
      console.log('Notification emitted globally to all dashboard listeners');

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
            io.to(roomName).emit('dashboard:notification', note);
            emittedCount++;
          }
        }
        
        console.log(`Notification emitted to ${emittedCount} ${appType} room(s)`);
      } catch (socketErr) {
        console.warn('Error emitting to socket rooms:', socketErr.message);
      }

      // Send Firebase push notifications to mobile apps - PRIMARY METHOD
      // This is the main way notifications are delivered to mobile apps
      try {
        const tokens = await DeviceToken.find({ userType: appType }).distinct('token');
        console.log(`📱 Found ${tokens.length} device token(s) for ${appType} users - sending via Firebase`);

        if (tokens && tokens.length) {
          const payload = {
            title: title || 'Notification',
            body: message || '',
            data: {
              noteId: note._id.toString(),
              appType,
              type: type || 'admin_broadcast',
              ...data
            }
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
                userType: appType 
              });
              console.log(`🧹 Cleaned up ${deleteResult.deletedCount} invalid device tokens for ${appType}`);
            } catch (cleanupErr) {
              console.warn('Failed to cleanup invalid tokens:', cleanupErr.message);
            }
          }

          console.log(`📱 Firebase push notification result for ${appType}:`, { 
            successCount, 
            failureCount, 
            totalTokens: tokens.length,
            invalidTokensRemoved: invalidTokensToRemove.length 
          });
        } else {
          console.warn(`⚠️ No device tokens found for ${appType} users - notification saved but not pushed to mobile apps`);
        }
      } catch (pe) {
        console.error(`❌ Firebase push notification failed for ${appType}:`, pe.message);
        console.error('Error details:', pe);
        // Don't throw - notification is still saved in database
      }

    } catch (e) {
      console.warn('Socket emit skipped:', e.message);
    }

    return note;
  } catch (err) {
    console.error('Failed to send notification to app type:', err);
    throw err;
  }
}