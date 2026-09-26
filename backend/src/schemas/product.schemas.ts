import { z } from 'zod';

export const productQuerySchema = z.object({
  query: z.object({
    search: z.string().optional(),
    categoryId: z.coerce.number().int().positive().optional(),
    categoryIds: z.string().optional(),
    minPrice: z.coerce.number().nonnegative().optional(),
    maxPrice: z.coerce.number().nonnegative().optional(),
    condition: z.enum(['NEW', 'USED', 'REFURBISHED']).optional(),
    location: z.string().optional(),
    state: z.string().optional(),
    deliveryType: z
      .string()
      .transform((s) => s.split(','))
      .pipe(z.array(z.enum(['PRESENCIAL', 'DELIVERY', 'ENVIO', 'RETIRO', 'PERMUTA'])))
      .optional(),
    acceptsTrade: z.enum(['true', 'false']).optional(),
    brand: z.string().optional(),
    sellerId: z.coerce.number().int().positive().optional(),
    tag: z.string().optional(),
    sort: z.enum(['newest', 'price_asc', 'price_desc', 'best_sellers', 'best_rated']).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    cursor: z.coerce.number().int().positive().optional(),
    featured: z.coerce.boolean().optional(),
  }),
});

// Lista blanca de campos que un vendedor puede enviar. Todo lo demás (isApproved, sellerId,
// slug, expiresAt, isFeatured, viewCount, etc.) se descarta: no se puede asignar desde el cliente.
const productImageSchema = z.object({
  url: z.string().trim().min(1, 'URL de imagen inválida').max(2000),
  isPrimary: z.boolean().optional(),
});

const productAttributeSchema = z.object({
  attributeDefinitionId: z.number().int().positive(),
  valueText: z.string().max(1000).optional(),
  valueNumber: z.number().optional(),
  valueBoolean: z.boolean().optional(),
});

const productFields = {
  name: z.string().trim().min(3, 'El nombre debe tener al menos 3 caracteres').max(200),
  categoryId: z.number().int().positive(),
  description: z.string().max(10000).optional(),
  brand: z.string().max(120).optional(),
  condition: z.enum(['NEW', 'USED', 'REFURBISHED']),
  conditionScore: z.number().int().min(1).max(10).optional(),
  price: z.number().positive('El precio debe ser positivo').max(1e9),
  originalPrice: z.number().positive().max(1e9).optional(),
  stock: z.number().int().nonnegative().max(1e7),
  sku: z.string().trim().max(60).optional(),
  masterSku: z.string().max(60).optional(),
  warrantyInfo: z.string().max(1000).optional(),
  deliveryTypes: z.array(z.enum(['PRESENCIAL', 'DELIVERY', 'ENVIO', 'RETIRO', 'PERMUTA'])).max(5).optional(),
  acceptsTrade: z.boolean().optional(),
  attributes: z.array(productAttributeSchema).max(60).optional(),
  tags: z.array(z.string().max(60)).max(30).optional(),
  images: z.array(productImageSchema).max(8, 'Máximo 8 imágenes por producto').optional(),
};

export const createProductSchema = z.object({
  body: z.object({
    ...productFields,
    condition: productFields.condition.default('NEW'),
    stock: productFields.stock.default(0),
  }),
});

export const updateProductSchema = z.object({
  body: z.object(productFields).partial(),
});

export const reviewSchema = z.object({
  body: z.object({
    rating: z.number().int().min(1).max(5),
    comment: z.string().min(3).max(1000).optional(),
  }),
});
