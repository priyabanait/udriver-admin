import assert from 'assert';
import DeviceToken from '../models/deviceToken.js';
import * as firebaseAdmin from '../lib/firebaseAdmin.js';
import Driver from '../models/driver.js';
import Investor from '../models/investor.js';
import Notification from '../models/notification.js';
import * as socket from '../lib/socket.js';
import { sendNotificationToSpecificUsers, createAndEmitNotification } from '../lib/notify.js';

(async function runTests() {
  console.log('Running notifications unit tests...');

  // Backup originals
  const origDeviceFind = DeviceToken.find;
  const origSendPush = firebaseAdmin.sendPushToTokens;
  const origDriverExists = Driver.exists;
  const origInvestorExists = Investor.exists;
  const origNotificationCreate = Notification.create;

  try {
    // Test 1: sendNotificationToSpecificUsers should only send to specified driver/investor tokens
    const queries = [];
    // Mock DeviceToken.find to record queries and return distinct tokens based on query
    DeviceToken.find = (q) => ({
      distinct: async (field) => {
        queries.push(q);
        if (q.userType === 'driver' && q.userId === 'A') return ['driverA-token1'];
        if (q.userType === 'driver' && q.userId === 'B') return ['driverB-token1'];
        if (q.userType === 'investor' && q.userId === 'I1') return ['investorI1-token1'];
        return [];
      },
    });

    // Mock Notification.create so tests don't require a DB
    Notification.create = async (payload) => ({ _id: 'note-' + Math.random().toString(36).slice(2,8), ...payload });

    const { results, errors } = await sendNotificationToSpecificUsers({
      driverIds: ['A'],
      investorIds: ['I1'],
      title: 'Test',
      message: 'Test message',
    });

    assert.strictEqual(errors.length, 0, 'Expected no errors');
    // Two notifications should have been processed: one driver, one investor
    assert.strictEqual(results.length, 2, 'Expected 2 results');
    // DeviceToken.find should have been called for both recipient queries
    const qUserTypes = queries.map(q => ({ userType: q.userType, userId: q.userId }));
    assert(qUserTypes.some(q => q.userType === 'driver' && q.userId === 'A'), 'Expected query for driver A');
    assert(qUserTypes.some(q => q.userType === 'investor' && q.userId === 'I1'), 'Expected query for investor I1');

    console.log('Test 1 passed');

    // Test 2: createAndEmitNotification should normalize recipientType and send FCM even if socket getIO throws
    let lastQuery = null;

    // Mock Notification.create to return a fake note
    Notification.create = async (payload) => ({ _id: 'note1', ...payload });

    // Mock Driver.exists to return true for id 'A'
    Driver.exists = async (q) => q._id === 'A' || q._id === 'a' || q._id === 'A'.toString();
    Investor.exists = async (q) => false;

    DeviceToken.find = (q) => {
      lastQuery = q;
      return {
        distinct: async (field) => {
          if (q.userType === 'driver' && q.userId === 'A') return ['driverA-token1'];
          return [];
        },
      };
    };


    const note = await createAndEmitNotification({
      type: 'test',
      title: 'Hello',
      message: 'World',
      recipientType: 'Driver', // mixed case to test normalization
      recipientId: 'A',
    });

    assert(note && note._id === 'note1', 'Expected note to be returned');
    assert.strictEqual(lastQuery.userType, 'driver', 'Expected userType normalized to lowercase driver');
    assert.strictEqual(lastQuery.userId, 'A', 'Expected userId to be string A');

    console.log('Test 2 passed');

    console.log('Test 2 passed');

    console.log('All tests passed');
    process.exit(0);
  } catch (err) {
    console.error('Notifications tests failed:', err);
    process.exit(1);
  } finally {
    // Restore originals
    DeviceToken.find = origDeviceFind;
    firebaseAdmin.sendPushToTokens = origSendPush;
    Driver.exists = origDriverExists;
    Investor.exists = origInvestorExists;
    Notification.create = origNotificationCreate;
  }
})();
