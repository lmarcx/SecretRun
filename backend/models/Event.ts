import mongoose, { Document, Schema } from 'mongoose';
import type { IUser } from './User.ts';

export interface IEvent extends Document {
  id: number;
  name: string;
  day: Date;
  startingHour: string;
  endingHour: string;
  place: string;
  memberLimit: number;
  creator: IUser['_id'];
  participants: IUser['_id'][];
}

const EventSchema: Schema = new Schema({
  id: {
    type: Number,
    unique: true,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  day: {
    type: Date,
    required: true
  },
  startingHour: {
    type: String,
    required: true
  },
  endingHour: {
    type: String,
    required: true
  },
  place: {
    type: String,
    required: true,
    trim: true
  },
  memberLimit: {
    type: Number,
    required: true,
    min: 1
  },
  creator: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  participants: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

export default mongoose.model<IEvent>('Event', EventSchema);