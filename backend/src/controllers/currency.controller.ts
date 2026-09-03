import { NextFunction, Response } from 'express';
import { Request } from 'express';

import * as currencyService from '../services/currency.service';
import { ok } from '../utils/response';
import { ApiError } from '../utils/errors';

export async function getCurrencies(_req: Request, res: Response, next: NextFunction) {
  try {
    const [currencies, ratesUpdatedAt] = await Promise.all([
      currencyService.getCurrencies(),
      currencyService.getRatesUpdatedAt(),
    ]);
    return ok(res, {
      base: currencyService.BASE_CURRENCY,
      currencies,
      ratesUpdatedAt,
    });
  } catch (error) {
    next(error);
  }
}

export async function refreshRates(_req: Request, res: Response, next: NextFunction) {
  try {
    const rates = await currencyService.refreshRates();
    return ok(res, { rates, message: 'Tasa actualizada desde la API oficial' });
  } catch (error) {
    next(ApiError.badRequest((error as Error).message));
  }
}

export async function setManualRate(req: Request, res: Response, next: NextFunction) {
  try {
    const { usdToBob } = req.body;
    if (!usdToBob) throw ApiError.badRequest('usdToBob obligatorio');
    const rates = await currencyService.setManualRate(Number(usdToBob));
    return ok(res, { rates, message: 'Tasa manual guardada' });
  } catch (error) {
    next(error);
  }
}

export async function setDefaultCurrency(req: Request, res: Response, next: NextFunction) {
  try {
    const { code } = req.body;
    if (!code) throw ApiError.badRequest('code obligatorio');
    await currencyService.setDefaultCurrency(code);
    return ok(res, { message: `Moneda por defecto: ${code}` });
  } catch (error) {
    next(ApiError.badRequest((error as Error).message));
  }
}

/** Cotizaciones en vivo USD/EUR/JPY/USDT en Bs (público, con caché 5 min). */
export async function getLiveRates(_req: Request, res: Response, next: NextFunction) {
  try {
    const rates = await currencyService.getLiveRates();
    return ok(res, rates);
  } catch (error) {
    next(error);
  }
}
