import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import type { IEvent } from './Event.ts';

export interface IUser extends Document {
  id: string;
  username: string;
  email: string;
  password?: string;
  eventsCreated: IEvent['_id'][];
  eventsParticipated: IEvent['_id'][];
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema: Schema<IUser> = new Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true, minlength: 6, select: false },
    eventsCreated: [{ type: Schema.Types.ObjectId, ref: 'Event' }],
    eventsParticipated: [{ type: Schema.Types.ObjectId, ref: 'Event' }]
  },
  { timestamps: true }
);

// 🔹 Pré-save hook pour hasher le mot de passe (async → pas de next)
UserSchema.pre<IUser>('save', async function () {
  if (!this.isModified('password') || !this.password) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// 🔹 Méthode pour comparer les mots de passe
UserSchema.methods.comparePassword = async function (candidatePassword: string) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model<IUser>('User', UserSchema);
