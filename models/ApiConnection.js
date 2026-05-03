import mongoose from 'mongoose';

const ApiConnectionSchema = new mongoose.Schema({
  provider: {
    type: String,
    required: true
  },
  systemKey: {
    type: String,
    required: true,
    unique: true
  },
  isActive: {
    type: Boolean,
    default: false
  },
  environment: {
    type: String,
    default: 'PROD',
    enum: ['TEST', 'PROD']
  },
  baseUrl: {
    type: String,
    required: true
  },
  apiKey: {
    type: String
  },
  clientId: {
    type: String
  },
  clientSecret: {
    type: String
  },
  settings: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { timestamps: true });

export default mongoose.models.ApiConnection || mongoose.model('ApiConnection', ApiConnectionSchema);
