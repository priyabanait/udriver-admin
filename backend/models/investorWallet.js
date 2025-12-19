import mongoose from 'mongoose';

const InvestorWalletSchema = new mongoose.Schema({
  phone: { type: String, required: true },
  balance: { type: Number, default: 0 },
  transactions: [
    {
      amount: Number,
      description: String,
      type: { type: String, enum: ['credit', 'debit'], default: 'credit' },
      date: { type: Date, default: Date.now }
    }
  ],
  // Array to store all investor online payments
  onlinePayments: [{
    date: { type: Date, default: Date.now },
    amount: { type: Number, required: true },
    mode: { type: String, enum: ['online', 'cash'], default: 'online' },
    type: { type: String, enum: ['investment', 'deposit', 'installment'], default: 'investment' },
    transactionId: { type: String },
    merchantOrderId: { type: String },
    paymentToken: { type: String },
    gateway: { type: String, default: 'ZWITCH' },
    status: { type: String, enum: ['captured', 'failed', 'cancelled', 'pending'], default: 'captured' },
    investmentId: { type: String }
  }]
}, { timestamps: true });

export default mongoose.models.InvestorWallet || mongoose.model('InvestorWallet', InvestorWalletSchema);
