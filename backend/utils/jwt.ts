import jwt, { SignOptions } from 'jsonwebtoken';
import mongoose from 'mongoose';

export const generateToken = (userId: string | mongoose.Types.ObjectId): string => {
  const options: SignOptions = {
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'],
  };
  return jwt.sign({ id: userId }, process.env.JWT_SECRET as string, options);
};


export const verifyToken = (token: string) => {
  return jwt.verify(token, process.env.JWT_SECRET as string);
};
