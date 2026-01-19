import mongoose from 'mongoose';

const ExpenseSchema = new mongoose.Schema({
  id: Number,
  title: String,
  category: String,
  subcategory: String,
  amount: Number,
  date: String, // store as ISO string for simplicity, can switch to Date
  vendor: String,
  vehicleId: String,
  driverId: String,
  driverName: String,
  description: String,
  status: String,
  receiptUrl: String,
  approvedBy: String,
  approvedDate: String,
  paymentMethod: String,
  invoiceNumber: String
}, { timestamps: true, strict: false });

export default mongoose.models.Expense || mongoose.model('Expense', ExpenseSchema);
