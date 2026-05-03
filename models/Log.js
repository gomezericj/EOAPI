import mongoose from 'mongoose';

const LogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    action: { type: String, enum: ['CREATE', 'DELETE', 'UPDATE'], required: true },
    entity: { type: String, required: true }, // e.g., 'Sale', 'Patient', 'Doctor'
    entityId: { type: String },
    details: { type: String }, // Human readable description e.g., "Eliminó venta de Juan Pérez"
    timestamp: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.models.Log || mongoose.model('Log', LogSchema);
