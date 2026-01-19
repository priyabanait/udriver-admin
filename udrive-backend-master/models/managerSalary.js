import mongoose from 'mongoose';

const managerSalarySchema = new mongoose.Schema({
  managerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Manager',
    required: true
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  year: {
    type: Number,
    required: true,
    min: 2020,
    max: 2100
  },
  // Attendance map: { day: status } where status is P, A, H, CL, HD, S, LOP
 attendanceMap: {
    type: Object, // 👈 CHANGE FROM Map TO Object
    default: {}
  },
  // Monthly salary amount
  salaryAmount: {
    type: Number,
    default: 0
  },
  // Calculated summary
  summary: {
    present: { type: Number, default: 0 },
    absent: { type: Number, default: 0 },
    halfDays: { type: Number, default: 0 },
    casualLeave: { type: Number, default: 0 },
    holiday: { type: Number, default: 0 },
    sunday: { type: Number, default: 0 },
    lop: { type: Number, default: 0 },
    totalSalary: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Create compound index to ensure one record per manager per month/year
managerSalarySchema.index({ managerId: 1, month: 1, year: 1 }, { unique: true });

const ManagerSalary = mongoose.model('ManagerSalary', managerSalarySchema);
export default ManagerSalary;

