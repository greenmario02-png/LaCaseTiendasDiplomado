import { NextFunction, Request, Response } from 'express';

import { verifyAccessToken, JwtPayload } from '../utils/jwt';
import { ApiError } from '../utils/errors';
import { prisma } from '../config/database';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    role: string;
    email: string;
    storeRole?: string | null;
    storeOwnerId?: number | null;
    storeName?: string | null;
    storeDescription?: string | null;
  };
}

export async function authenticate(req: AuthRequest, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Token no provisto');
    }

    const token = header.split(' ')[1];
    const payload = verifyAccessToken(token) as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true, email: true, isActive: true, storeRole: true, storeOwnerId: true, storeName: true, storeDescription: true },
    });

    if (!user || !user.isActive) {
      throw ApiError.unauthorized('Usuario no activo');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    next(ApiError.unauthorized('Token inválido o expirado'));
  }
}

export async function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) {
      const token = header.split(' ')[1];
      const payload = verifyAccessToken(token) as JwtPayload;
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
      select: { id: true, role: true, email: true, isActive: true, storeRole: true, storeOwnerId: true, storeName: true, storeDescription: true },
      });
      if (user && user.isActive) req.user = user;
    }
    next();
  } catch {
    next();
  }
}
