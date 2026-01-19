import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    title: { type: String, default: "" },
    message: { type: String, default: "" },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    // recipientType can be 'driver', 'investor' or any other string to target notifications
    recipientType: { type: String, default: null },
    recipientId: { type: String, default: null }, // Changed from Mixed to String for consistent querying
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.models.Notification ||
  mongoose.model("Notification", NotificationSchema);
