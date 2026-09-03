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

export const createProductSchema = z.object({
  body: z.object({
    name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
    categoryId: z.number().int().positive(),
    description: z.string().min(10).optional(),
    condition: z.enum(['NEW', 'USED', 'REFURBISHED']).default('NEW'),
    conditionScore: z.number().int().min(1).max(10).optional(),
    price: z.number().positive('El precio debe ser positivo'),
    originalPrice: z.number().positive().optional(),
    stock: z.number().int().nonnegative().default(0),
    sku: z.string().min(1).optional(),
    masterSku: z.string().optional(),
    warrantyInfo: z.string().optional(),
    attributes: z
      .array(
        z.object({
          attributeDefinitionId: z.number().int().positive(),
          valueText: z.string().optional(),
          valueNumber: z.number().optional(),
          valueBoolean: z.boolean().optional(),
        })
      )
      .optional(),
    tags: z.array(z.string()).optional(),
    images: z
      .array(
        z.object({
          url: z.string().min(1, 'URL de imagen inválida'),
          isPrimary: z.boolean().optional(),
        })
      )
      .max(8, 'Máximo 8 imágenes por producto')
      .optional(),
  }),
});

export const updateProductSchema = createProductSchema.partial().extend({
  body: createProductSchema.shape.body.partial().optional(),
});

export const reviewSchema = z.object({
  body: z.object({
    rating: z.number().int().min(1).max(5),
    comment: z.string().min(3).max(1000).optional(),
  }),
});
