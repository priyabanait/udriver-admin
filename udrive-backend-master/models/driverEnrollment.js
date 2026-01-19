import mongoose from 'mongoose';

const DriverEnrollmentSchema = new mongoose.Schema({
  id: Number,
  driverId: String,
  driverName: String,
  phone: String,
  planId: Number,
  planName: String,
  enrolledDate: String,
  status: String,
  monthlyFee: Number,
  commissionRate: Number,
  vehicleAssigned: String,
  performanceRating: Number,
  totalEarnings: Number,
  lastPayment: String
}, { timestamps: true, strict: false });

export default mongoose.models.DriverEnrollment || mongoose.model('DriverEnrollment', DriverEnrollmentSchema);
