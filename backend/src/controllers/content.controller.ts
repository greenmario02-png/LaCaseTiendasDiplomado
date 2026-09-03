import { NextFunction, Response } from 'express';
import { Request } from 'express';

import { prisma } from '../config/database';
import { ok } from '../utils/response';

export async function banners(_req: Request, res: Response, next: NextFunction) {
  try {
    const now = new Date();
    const banners = await prisma.banner.findMany({
      where: { isActive: true, startDate: { lte: now }, endDate: { gte: now } },
      orderBy: { order: 'asc' },
    });
    return ok(res, banners);
  } catch (error) {
    next(error);
  }
}

export async function promotions(_req: Request, res: Response, next: NextFunction) {
  try {
    const now = new Date();
    const promotions = await prisma.promotion.findMany({
      where: { isActive: true, startDate: { lte: now }, endDate: { gte: now } },
      include: {
        products: {
          include: {
            product: {
              include: {
                images: { take: 1, select: { url: true } },
                seller: { select: { storeName: true, rating: true } },
                category: { select: { name: true, slug: true } },
              },
            },
          },
        },
      },
      orderBy: { startDate: 'desc' },
    });
    return ok(res, promotions);
  } catch (error) {
    next(error);
  }
}

export async function faqs(_req: Request, res: Response, next: NextFunction) {
  try {
    const faqs = await prisma.faq.findMany({ orderBy: { order: 'asc' } });
    return ok(res, faqs);
  } catch (error) {
    next(error);
  }
}

export async function warranties(_req: Request, res: Response, next: NextFunction) {
  try {
    const warranties = await prisma.warranty.findMany({ orderBy: { order: 'asc' } });
    return ok(res, warranties);
  } catch (error) {
    next(error);
  }
}

export async function reaches(_req: Request, res: Response, next: NextFunction) {
  try {
    const reaches = await prisma.reach.findMany({ orderBy: { order: 'asc' } });
    return ok(res, reaches);
  } catch (error) {
    next(error);
  }
}
