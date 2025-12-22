import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './User';

export interface IEvent extends Document {
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