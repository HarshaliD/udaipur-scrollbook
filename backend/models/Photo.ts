import mongoose, { Document, Schema } from 'mongoose';

export interface IPhoto extends Document {
  tripId: mongoose.Types.ObjectId;
  cloudinaryUrl: string;
  driveUrl: string | null;
  driveFileId: string | null;
  status: 'uploaded' | 'drive_pending' | 'complete';
  placeSlug: string;
  placeName: string;
  uploaderName: string;
  uploaderAvatar: string;
  uploaderId: mongoose.Types.ObjectId;
  uploadedAt: Date;
}

const photoSchema = new Schema<IPhoto>({
  tripId: { type: Schema.Types.ObjectId, ref: 'Trip', required: true, index: true },
  cloudinaryUrl: { type: String, required: true },
  driveUrl: { type: String, default: null },
  driveFileId: { type: String, default: null },
  status: { type: String, enum: ['uploaded', 'drive_pending', 'complete'], default: 'drive_pending' },
  placeSlug: { type: String, required: true, index: true },
  placeName: { type: String, required: true },
  uploaderName: { type: String, required: true },
  uploaderAvatar: { type: String, required: true },
  uploaderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  uploadedAt: { type: Date, default: Date.now }
});

export default mongoose.model<IPhoto>('Photo', photoSchema);
