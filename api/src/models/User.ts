// src/models/User.ts
import { Schema, model, HydratedDocument } from "mongoose";

export interface IUser {
  username: string;
  email: string;
  password: string; // hash bcrypt
  resetPasswordToken?: string;
  resetPasswordExpiry?: Date;
}

// Documento “vivo” que retorna Mongoose al hacer .create/.find
export type UserDoc = HydratedDocument<IUser>;

const userSchema = new Schema<IUser>(
  {
    username: String,
    email: String,
    password: String,
    resetPasswordToken: String,
    resetPasswordExpiry: Date,
  },
  { timestamps: true }
);

export const User = model<IUser>("User", userSchema);
