import mongoose from 'mongoose';

const DriverSignupSchema = new mongoose.Schema({
  username: { type: String, unique: true, sparse: true },
  mobile: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  status: { type: String, default: 'pending', enum: ['pending', 'active', 'inactive', 'suspended'] },
  kycStatus: { type: String, default: 'pending', enum: ['pending', 'verified', 'rejected', 'incomplete'] },
  signupDate: { type: Date, default: Date.now },
  registrationCompleted: { type: Boolean, default: false },
  // Store full registration details
  name: String,
  email: String,
  phone: String,
  dateOfBirth: String,
  address: String,
  latitude: String,
  longitude: String,
  licenseNumber: String,
  licenseExpiryDate: String,
  licenseClass: String,
  aadharNumber: String,
  panNumber: String,
  electricBillNo: String,
  experience: String,
  previousEmployment: String,
  planType: String,
  vehiclePreference: String,
  bankName: String,
  accountNumber: String,
  ifscCode: String,
  accountHolderName: String,
  accountBranchName: String,
  profilePhoto: String,
  signature: String, // URL or base64-encoded signature image
  licenseDocument: String,
  aadharDocument: String,
  aadharDocumentBack: String,
  panDocument: String,
  bankDocument: String,
  electricBillDocument: String
}, { timestamps: true });

export default mongoose.models.DriverSignup || mongoose.model('DriverSignup', DriverSignupSchema);
