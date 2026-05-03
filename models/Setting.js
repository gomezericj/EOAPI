import mongoose from 'mongoose';

const SettingSchema = new mongoose.Schema({
  retentionPercentage: {
    type: Number,
    required: true,
    default: 13
  },
  clinicName: {
    type: String,
    default: 'Estética Oral 2L'
  },
  logoBase64: {
    type: String,
    default: ''
  },
  primaryColor: {
    type: String,
    default: '#0ea5e9' // sky-500 from tailwind/current CSS
  }
}, { timestamps: true });

// We only want a single document for settings, so we can use a fixed ID or just findOne.
export default mongoose.models.Setting || mongoose.model('Setting', SettingSchema);
