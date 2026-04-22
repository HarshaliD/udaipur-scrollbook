import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { verifyToken } from '../utils/jwt';

export interface AuthRequest extends Request {
  user?: {
    id: string;
  };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  let token = req.headers.authorization;

  if (!token || !token.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Not authorized, no token or invalid format' });
    return;
  }

  token = token.split(' ')[1];
  
  try {
    const decoded = verifyToken(token) as { id: string };
    req.user = { id: decoded.id };
    next();
  } catch (error) {
    res.status(401).json({ error: 'Not authorized, token failed' });
  }
};
