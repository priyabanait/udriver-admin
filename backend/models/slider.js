import mongoose from 'mongoose';

const SliderSchema = new mongoose.Schema({
  imageUrl: { type: String, required: true },
  publicId: { type: String },
  // strictly image-only: we store just the image URL and public id. Metadata fields removed intentionally.
  active: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('Slider', SliderSchema);
