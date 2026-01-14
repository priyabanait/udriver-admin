import express from 'express';
import Transaction from '../models/transaction.js';
import { authenticateToken } from './middleware.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    const total = await Transaction.countDocuments();
    const list = await Transaction.find()
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean();
    
    // Calculate total amount if requested
    if (req.query.include === 'summary') {
      // Get all transactions for summary calculations
      const allTransactions = await Transaction.find().lean();
      const totalAmount = allTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
      const completedAmount = allTransactions.filter(t => t.status === 'completed').reduce((sum, t) => sum + (t.amount || 0), 0);
      const pendingAmount = allTransactions.filter(t => t.status === 'pending').reduce((sum, t) => sum + (t.amount || 0), 0);
      
      return res.json({
        data: list,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasMore: page * limit < total
        },
        summary: {
          total: allTransactions.length,
          totalAmount,
          completedAmount,
          pendingAmount,
          completedCount: allTransactions.filter(t => t.status === 'completed').length,
          pendingCount: allTransactions.filter(t => t.status === 'pending').length,
          failedCount: allTransactions.filter(t => t.status === 'failed').length
        }
      });
    }
    
    res.json({
      data: list,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total
      }
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ message: 'Failed to fetch transactions', error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const transaction = await Transaction.findOne({ id }).lean();
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    
    // Include summary if requested
    if (req.query.include === 'summary') {
      // Calculate driver's total transactions
      const driverTransactions = await Transaction.find({ driverId: transaction.driverId }).lean();
      const summary = {
        driverTotal: driverTransactions.length,
        driverTotalAmount: driverTransactions.reduce((sum, t) => sum + (t.amount || 0), 0),
        driverCompletedAmount: driverTransactions.filter(t => t.status === 'completed').reduce((sum, t) => sum + (t.amount || 0), 0),
        driverPendingAmount: driverTransactions.filter(t => t.status === 'pending').reduce((sum, t) => sum + (t.amount || 0), 0),
        driverCompletedCount: driverTransactions.filter(t => t.status === 'completed').length,
        driverPendingCount: driverTransactions.filter(t => t.status === 'pending').length,
      };
      
      return res.json({
        transaction,
        summary
      });
    }
    
    res.json(transaction);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch transaction', error: err.message });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  const max = await Transaction.find().sort({ id: -1 }).limit(1).lean();
  const nextId = (max[0]?.id || 0) + 1;
  const body = req.body || {};
  const tx = await Transaction.create({ id: nextId, ...body });
  // Notify dashboard and target related parties when available
  try {
    const { createAndEmitNotification } = await import('../lib/notify.js');
    const Driver = (await import('../models/driver.js')).default;
    const DriverSignup = (await import('../models/driverSignup.js')).default;
    const Investor = (await import('../models/investor.js')).default;
    const InvestorSignup = (await import('../models/investorSignup.js')).default;
    
    const payload = {
      type: 'transaction',
      title: `Transaction ${tx.id} - ${tx.status || 'new'}`,
      message: `Amount: ${tx.amount || 0}`,
      data: { id: String(tx._id), txId: String(tx.id) }
    };

    // If this transaction relates to an investor or driver, save recipient info so they get targeted notifications
    if (tx.investorId) {
      // Convert to actual Investor._id if needed
      let investorRecipientId = String(tx.investorId);
      try {
        let investor = await Investor.findById(String(tx.investorId)).lean();
        if (!investor) {
          const investorSignup = await InvestorSignup.findById(String(tx.investorId)).lean();
          if (investorSignup && investorSignup.phone) {
            investor = await Investor.findOne({ phone: investorSignup.phone }).lean();
            if (investor) investorRecipientId = String(investor._id);
          }
        }
      } catch (e) {
        console.warn('[TRANSACTION] Investor lookup failed:', e.message);
      }
      await createAndEmitNotification({ ...payload, recipientType: 'investor', recipientId: investorRecipientId });
    } else if (tx.driverId) {
      // Convert to actual Driver._id if needed
      let driverRecipientId = String(tx.driverId);
      try {
        let driver = await Driver.findById(String(tx.driverId)).lean();
        if (!driver) {
          const driverSignup = await DriverSignup.findById(String(tx.driverId)).lean();
          if (driverSignup && driverSignup.mobile) {
            driver = await Driver.findOne({ mobile: driverSignup.mobile }).lean();
            if (driver) driverRecipientId = String(driver._id);
          }
        }
      } catch (e) {
        console.warn('[TRANSACTION] Driver lookup failed:', e.message);
      }
      await createAndEmitNotification({ ...payload, recipientType: 'driver', recipientId: driverRecipientId });
    } else {
      await createAndEmitNotification(payload);
    }
  } catch (err) {
    console.warn('Notify failed:', err.message);
  }
  res.status(201).json(tx);
});

router.delete('/:id', authenticateToken, async (req, res) => {
  const id = Number(req.params.id);
  await Transaction.deleteOne({ id });
  res.json({ message: 'Deleted' });
});

export default router;
