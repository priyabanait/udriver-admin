import express from 'express';
import Dashboard from '../models/dashboard.js';
import Driver from '../models/driver.js';
import Vehicle from '../models/vehicle.js';
import Investor from '../models/investor.js';
import Ticket from '../models/ticket.js';
import Transaction from '../models/transaction.js';
import Expense from '../models/expense.js';

const router = express.Router();

// Returns dashboard summary. If a Dashboard document exists, return it.
// Otherwise compute the values from current collections.
router.get('/', async (req, res) => {
  try {
    const doc = await Dashboard.findOne().lean();
    if (doc) return res.json(doc);

    // Compute aggregates from collections
    const [
      totalDrivers,
      activeDrivers,
      pendingKyc,
      totalVehicles,
      activeVehicles,
      totalInvestors,
      openTickets,
      totalTransactions,
      totalExpenses
    ] = await Promise.all([
      Driver.countDocuments({}),
      Driver.countDocuments({ status: 'active' }),
      Driver.countDocuments({ kycStatus: 'pending' }),
      Vehicle.countDocuments({}),
      Vehicle.countDocuments({ status: 'active' }),
      Investor.countDocuments({}),
      Ticket.countDocuments({ status: { $in: ['open', 'pending'] } }),
      Transaction.countDocuments({}),
      Expense.countDocuments({})
    ]);

    return res.json({
      totalDrivers,
      activeDrivers,
      pendingKyc,
      totalVehicles,
      activeVehicles,
      totalInvestors,
      openTickets,
      totalTransactions,
      totalExpenses
    });
  } catch (err) {
    console.error('Failed to compute dashboard summary:', err);
    res.status(500).json({ error: 'failed to compute dashboard summary' });
  }
});

export default router;
