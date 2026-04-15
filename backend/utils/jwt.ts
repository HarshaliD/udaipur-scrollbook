import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

export const generateToken = (userId: string | mongoose.Types.ObjectId): string => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET as string, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

export const verifyToken = (token: string) => {
  return jwt.verify(token, process.env.JWT_SECRET as string);
};
