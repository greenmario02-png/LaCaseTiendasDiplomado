import { NextFunction, Response } from 'express';

import { AuthRequest } from '../middlewares/auth';
import * as cartService from '../services/cart.service';
import { ok, created } from '../utils/response';

export async function getCart(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const cart = await cartService.getCart(req);
    return ok(res, cart);
  } catch (error) {
    next(error);
  }
}

export async function addItem(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { productId, quantity, variantId } = req.body;
    const cart = await cartService.addItem(req, productId, quantity || 1, variantId);
    return created(res, cart);
  } catch (error) {
    next(error);
  }
}

export async function updateItem(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const cart = await cartService.updateItemQuantity(req, Number(req.params.id), req.body.quantity);
    return ok(res, cart);
  } catch (error) {
    next(error);
  }
}

export async function removeItem(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const cart = await cartService.removeItem(req, Number(req.params.id));
    return ok(res, cart);
  } catch (error) {
    next(error);
  }
}

export async function clear(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await cartService.clearCart(req);
    return ok(res, result);
  } catch (error) {
    next(error);
  }
}

export async function merge(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const sessionId = req.body.sessionId;
    if (!sessionId) return next(new Error('sessionId obligatorio'));
    await cartService.mergeGuestCart(req.user!.id, sessionId);
    const cart = await cartService.getCart(req);
    return ok(res, cart);
  } catch (error) {
    next(error);
  }
}
