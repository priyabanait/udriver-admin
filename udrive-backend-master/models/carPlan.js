import mongoose from 'mongoose';

// Weekly rent slabs with accidental cover and acceptance rate
const WeeklyRentSlabSchema = new mongoose.Schema({
  trips: String,
  rentDay: Number,
  weeklyRent: Number,
  accidentalCover: { type: Number, default: 105 },
  acceptanceRate: { type: Number, default: 60 }
}, { _id: false });

// Daily rent slabs without accidental cover and acceptance rate
const DailyRentSlabSchema = new mongoose.Schema({
  trips: String,
  rentDay: Number,
  weeklyRent: Number
}, { _id: false });



const CarPlanSchema = new mongoose.Schema({
  name: { type: String, required: true },
  vehicleType: { type: String },
  securityDeposit: { type: Number, default: 0 },
  weeklyRentSlabs: { type: [WeeklyRentSlabSchema], default: [] },
  dailyRentSlabs: { type: [DailyRentSlabSchema], default: [] },
  status: { type: String, default: 'active' },
  category: { type: String, default: 'standard' },
  createdDate: String,
  photo: { type: String } // Add photo URL field
}, { timestamps: true });

export default mongoose.models.CarPlan || mongoose.model('CarPlan', CarPlanSchema);
