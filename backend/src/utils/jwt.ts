import crypto from 'crypto';

import jwt, { SignOptions } from 'jsonwebtoken';

import { env } from '../config/env';

export interface JwtPayload {
  userId: number;
  role: string;
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as SignOptions);
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}

export function signRefreshToken(userId: number): string {
  return jwt.sign({ userId }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  } as SignOptions);
}

export function verifyRefreshToken(token: string): { userId: number } {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as { userId: number };
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
