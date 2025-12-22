import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import type { IEvent } from './Event.ts';

export interface IUser extends Document {
  id: number;
  username: string;
  email: string;
  password?: string; // Optional because it will not be sent back to the client
  eventsCreated: IEvent['_id'][];
  eventsParticipated: IEvent['_id'][];
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema: Schema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
    select: false // Do not return password by default
  },
  eventsCreated: [{
    type: Schema.Types.ObjectId,
    ref: 'Event'
  }],
  eventsParticipated: [{
    type: Schema.Types.ObjectId,
    ref: 'Event'
  }]
}, {
  timestamps: true
});

// Hash password before saving
UserSchema.pre<IUser>('save', async function() {
  if (!this.isModified('password') || !this.password) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare password
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model<IUser>('User', UserSchema);

function next() {
  throw new Error('Function not implemented.');
}
