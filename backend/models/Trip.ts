import mongoose, { Document, Schema } from 'mongoose';

export interface IItineraryItem {
  placeSlug: string;
  placeName: string;
  order: number;
  plannedDate?: string;
}

export interface ITrip extends Document {
  name: string;
  adminId: mongoose.Types.ObjectId;
  members: mongoose.Types.ObjectId[];
  inviteCode: string;
  itinerary: IItineraryItem[];
  createdAt: Date;
}

const itineraryItemSchema = new Schema<IItineraryItem>(
  {
    placeSlug: { type: String, required: true },
    placeName: { type: String, required: true },
    order: { type: Number, required: true },
    plannedDate: { type: String },
  },
  { _id: false }
);

const tripSchema = new Schema<ITrip>({
  name: { type: String, required: true, trim: true },
  adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  inviteCode: { type: String, required: true, unique: true, index: true },
  itinerary: { type: [itineraryItemSchema], default: [] },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<ITrip>('Trip', tripSchema);
