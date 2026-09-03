import { Response } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from '../middlewares/auth';
import { ApiError } from '../utils/errors';
import { ok } from '../utils/response';

// ---------- ADMIN ----------

export async function listTaxRates(req: AuthRequest, res: Response) {
  const rates = await prisma.taxRate.findMany({
    orderBy: { createdAt: 'desc' },
    include: { category: { select: { id: true, name: true } } },
  });
  ok(res, rates);
}

export async function createTaxRate(req: AuthRequest, res: Response) {
  const { name, country, state, ratePercent, appliesTo, categoryId, isActive } = req.body;
  if (!name || !country || ratePercent == null) throw ApiError.badRequest('name, country y ratePercent son obligatorios');
  if (Number(ratePercent) < 0 || Number(ratePercent) > 100) throw ApiError.badRequest('El porcentaje debe estar entre 0 y 100');

  const rate = await prisma.taxRate.create({
    data: {
      name,
      country: country.toUpperCase(),
      state: state || null,
      ratePercent: Number(ratePercent),
      appliesTo: appliesTo || 'ALL',
      categoryId: categoryId || null,
      isActive: isActive !== false,
    },
  });
  ok(res, rate, 201);
}

export async function updateTaxRate(req: AuthRequest, res: Response) {
  const id = Number(req.params.id);
  const existing = await prisma.taxRate.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Tasa de impuesto no encontrada');

  const { name, country, state, ratePercent, appliesTo, categoryId, isActive } = req.body;
  const rate = await prisma.taxRate.update({
    where: { id },
    data: {
      name: name ?? existing.name,
      country: country ? String(country).toUpperCase() : existing.country,
      state: state !== undefined ? state : existing.state,
      ratePercent: ratePercent != null ? Number(ratePercent) : existing.ratePercent,
      appliesTo: appliesTo ?? existing.appliesTo,
      categoryId: categoryId !== undefined ? categoryId : existing.categoryId,
      isActive: isActive !== undefined ? isActive : existing.isActive,
    },
  });
  ok(res, rate);
}

export async function deleteTaxRate(req: AuthRequest, res: Response) {
  const id = Number(req.params.id);
  await prisma.taxRate.delete({ where: { id } });
  ok(res, { id });
}

// ---------- PÚBLICO / CÁLCULO ----------

/**
 * Calcula el impuesto aplicable a un producto para un país (y opcional estado).
 * Prioridad: tasa específica del producto > tasa de su categoría > tasa ALL del país.
 */
export async function getProductTax(productId: number, country: string, state?: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { taxRate: true, category: true },
  });
  if (!product) return 0;

  const countryUpper = country.toUpperCase();

  // 1. Tasa asignada directamente al producto
  if (product.taxRate?.isActive) {
    if (product.taxRate.country === countryUpper && (!state || !product.taxRate.state || product.taxRate.state === state)) {
      return Number(product.taxRate.ratePercent);
    }
  }

  // 2. Tasa de la categoría
  const catRate = await prisma.taxRate.findFirst({
    where: { isActive: true, appliesTo: 'CATEGORY', categoryId: product.categoryId, country: countryUpper },
  });
  if (catRate) return Number(catRate.ratePercent);

  // 3. Tasa genérica del país (o la subcategoría padre)
  const generic = await prisma.taxRate.findFirst({
    where: { isActive: true, appliesTo: 'ALL', country: countryUpper },
  });
  if (generic) return Number(generic.ratePercent);

  return 0;
}

export async function calculateTax(req: AuthRequest, res: Response) {
  const { productId, price, country, state } = req.body;
  if (!productId || price == null) throw ApiError.badRequest('productId y price son obligatorios');
  const rate = await getProductTax(Number(productId), country || 'BO', state);
  const amount = (Number(price) * rate) / 100;
  ok(res, { rate, amount, totalWithTax: Number(price) + amount });
}
