import { NextFunction, Response } from 'express';

import { AuthRequest } from '../middlewares/auth';
import { prisma } from '../config/database';
import { ApiError } from '../utils/errors';
import { ok, created } from '../utils/response';
import * as orderService from '../services/order.service';

export async function getProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        profileImage: true,
        bio: true,
        role: true,
        storeName: true,
        storeDescription: true,
        storeLogo: true,
        storeBanner: true,
        storeCategory: true,
        country: true,
        gamerCoins: true,
        isVerified: true,
        createdAt: true,
        locationCity: true,
        locationState: true,
        locationPostalCode: true,
      },
    });
    return ok(res, user);
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const allowed = ['firstName', 'lastName', 'phone', 'profileImage', 'bio', 'country', 'locationCity', 'locationState', 'locationPostalCode'];
    const data: any = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) data[key] = req.body[key];
    }

    const user = await prisma.user.update({ where: { id: req.user!.id }, data });
    return ok(res, user);
  } catch (error) {
    next(error);
  }
}

/** Guarda (o limpia con pushToken null/vacío) el token de push del dispositivo del usuario. */
export async function updatePushToken(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const raw = typeof req.body?.pushToken === 'string' ? req.body.pushToken.trim() : '';
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { pushToken: raw || null },
      select: { id: true, email: true, pushToken: true },
    });
    return ok(res, user);
  } catch (error) {
    next(error);
  }
}

export async function listAddresses(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const addresses = await prisma.address.findMany({
      where: { userId: req.user!.id },
      orderBy: { isDefault: 'desc' },
    });
    return ok(res, addresses);
  } catch (error) {
    next(error);
  }
}

export async function createAddress(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { street, number, floor, city, state, postalCode, isDefault } = req.body;

    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId: req.user!.id },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.create({
      data: {
        userId: req.user!.id,
        street,
        number,
        floor: floor || null,
        city,
        state,
        postalCode,
        isDefault: isDefault ?? false,
      },
    });
    return created(res, address);
  } catch (error) {
    next(error);
  }
}

export async function updateAddress(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const addressId = Number(req.params.id);
    const address = await prisma.address.findFirst({ where: { id: addressId, userId: req.user!.id } });
    if (!address) throw ApiError.notFound('Dirección no encontrada');

    if (req.body.isDefault) {
      await prisma.address.updateMany({ where: { userId: req.user!.id }, data: { isDefault: false } });
    }

    const updated = await prisma.address.update({ where: { id: addressId }, data: req.body });
    return ok(res, updated);
  } catch (error) {
    next(error);
  }
}

export async function deleteAddress(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const addressId = Number(req.params.id);
    const address = await prisma.address.findFirst({ where: { id: addressId, userId: req.user!.id } });
    if (!address) throw ApiError.notFound('Dirección no encontrada');

    await prisma.address.delete({ where: { id: addressId } });
    return ok(res, { message: 'Dirección eliminada' });
  } catch (error) {
    next(error);
  }
}

export async function myOrders(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const result = await orderService.getBuyerOrders(req.user!.id, page, limit);
    return res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function myOrderDetail(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const order = await orderService.getBuyerOrderById(req.user!.id, Number(req.params.id));
    return ok(res, order);
  } catch (error) {
    next(error);
  }
}
