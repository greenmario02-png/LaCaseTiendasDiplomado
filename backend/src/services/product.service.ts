import { Prisma } from '@prisma/client';

import { prisma } from '../config/database';
import { ApiError } from '../utils/errors';

export interface ProductFilters {
  search?: string;
  categoryId?: number;
  categoryIds?: number[];
  minPrice?: number;
  maxPrice?: number;
  condition?: string;
  location?: string;
  state?: string;
  deliveryType?: string;
  acceptsTrade?: boolean;
  brand?: string;
  sellerId?: number;
  tag?: string;
  sort?: string;
  page?: number;
  limit?: number;
  cursor?: number;
  featured?: boolean;
}

const PRODUCT_INCLUDE = {
  seller: {
    select: {
      id: true,
      storeName: true,
      rating: true,
      locationCity: true,
      locationState: true,
      freeShippingThreshold: true,
      isVerified: true,
    },
  },
  category: {
    select: { id: true, name: true, slug: true },
  },
  images: {
    orderBy: { order: 'asc' as const },
    select: { id: true, url: true, isPrimary: true },
  },
  attributes: {
    include: {
      attributeDefinition: {
        select: { id: true, name: true, unit: true, type: true },
      },
    },
  },
  variants: {
    select: { id: true, sku: true, priceModifier: true, stock: true, attributesJson: true },
  },
  tags: {
    include: { tag: { select: { id: true, name: true, slug: true } } },
  },
};

function buildWhere(filters: ProductFilters): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {
    isActive: true,
    isApproved: true,
  };

  if (filters.featured) where.isFeatured = true;

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
      { sku: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  if (filters.categoryId) where.categoryId = filters.categoryId;

  if (filters.categoryIds && filters.categoryIds.length > 0) {
    where.categoryId = { in: filters.categoryIds };
  }

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    where.price = {};
    if (filters.minPrice !== undefined) where.price.gte = filters.minPrice;
    if (filters.maxPrice !== undefined) where.price.lte = filters.maxPrice;
  }

  if (filters.condition) where.condition = filters.condition as any;

  if (filters.deliveryType) {
    const type = Array.isArray(filters.deliveryType) ? filters.deliveryType[0] : filters.deliveryType;
    where.deliveryTypes = { has: type as any };
  }

  if (filters.acceptsTrade !== undefined) {
    where.acceptsTrade = filters.acceptsTrade;
  }

  if (filters.brand) {
    where.brand = { contains: filters.brand, mode: 'insensitive' };
  }

  if (filters.sellerId) {
    where.sellerId = filters.sellerId;
  }

  if (filters.location) {
    where.seller = {
      locationCity: { contains: filters.location, mode: 'insensitive' },
    };
  }

  if (filters.state) {
    where.seller = {
      ...(where.seller as object),
      locationState: { contains: filters.state, mode: 'insensitive' },
    };
  }

  if (filters.tag) {
    where.tags = {
      some: { tag: { slug: filters.tag } },
    };
  }

  return where;
}

function buildOrderBy(sort?: string): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case 'price_asc':
      return [{ price: 'asc' }];
    case 'price_desc':
      return [{ price: 'desc' }];
    case 'best_sellers':
      return [{ saleCount: 'desc' }];
    case 'best_rated':
      return [{ reviews: { _count: 'desc' } }];
    case 'newest':
    default:
      return [{ createdAt: 'desc' }];
  }
}

export async function listProducts(filters: ProductFilters) {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;

  // Si se filtra por categoría, incluir también sus subcategorías
  // (los productos viven en categorías hoja; filtrar por la raíz
  // devuelve vacío si no se expanden las hijas).
  const resolvedFilters = { ...filters };
  if (resolvedFilters.categoryId && !resolvedFilters.categoryIds?.length) {
    const children = await prisma.category.findMany({
      where: { parentId: resolvedFilters.categoryId, isActive: true },
      select: { id: true },
    });
    if (children.length > 0) {
      resolvedFilters.categoryIds = [resolvedFilters.categoryId, ...children.map((c) => c.id)];
      delete resolvedFilters.categoryId;
    }
  }

  const where = buildWhere(resolvedFilters);
  const orderBy = buildOrderBy(filters.sort);

  let products;
  let total: number;

  if (filters.cursor) {
    const cursorProduct = await prisma.product.findUnique({
      where: { id: filters.cursor },
      select: { id: true, createdAt: true },
    });
    if (!cursorProduct) throw ApiError.badRequest('Cursor inválido');

    const cursorWhere: Prisma.ProductWhereInput = {
      ...where,
      OR: [{ createdAt: { lt: cursorProduct.createdAt } }, { createdAt: cursorProduct.createdAt, id: { lt: cursorProduct.id } }],
    };

    [products, total] = await Promise.all([
      prisma.product.findMany({
        where: cursorWhere,
        take: limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: PRODUCT_INCLUDE,
      }),
      prisma.product.count({ where }),
    ]);
  } else {
    [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
        include: PRODUCT_INCLUDE,
      }),
      prisma.product.count({ where }),
    ]);
  }

  const lastItem = products[products.length - 1];
  const nextCursor = products.length === limit && lastItem ? lastItem.id : null;
  const hasMore = nextCursor !== null;

  return {
    data: products,
    meta: {
      page: filters.cursor ? undefined : page,
      limit,
      total,
      totalPages: filters.cursor ? undefined : Math.ceil(total / limit),
      nextCursor,
      hasMore,
    },
  };
}

export async function getProductById(id: number) {
  if (!Number.isInteger(id)) throw ApiError.badRequest('ID de producto inválido');

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      ...PRODUCT_INCLUDE,
      reviews: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
        },
        take: 20,
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!product || !product.isActive) throw ApiError.notFound('Producto no encontrado');
  return product;
}

export async function getFeaturedProducts() {
  return prisma.product.findMany({
    where: { isActive: true, isApproved: true, isFeatured: true },
    take: 12,
    orderBy: { saleCount: 'desc' },
    include: PRODUCT_INCLUDE,
  });
}

export async function getRelatedProducts(productId: number, categoryId: number, excludePrice: number) {
  return prisma.product.findMany({
    where: {
      isActive: true,
      isApproved: true,
      categoryId,
      id: { not: productId },
      price: { gte: excludePrice * 0.5, lte: excludePrice * 1.5 },
    },
    take: 8,
    orderBy: { saleCount: 'desc' },
    include: PRODUCT_INCLUDE,
  });
}

export async function getCategoriesTree() {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    include: {
      children: { where: { isActive: true }, include: { _count: { select: { products: true } } } },
      _count: { select: { products: true } },
    },
    orderBy: { order: 'asc' },
  });

  return categories
    .filter((c) => c.parentId === null)
    .map((parent) => {
      const children = parent.children.map((child) => ({
        id: child.id,
        name: child.name,
        slug: child.slug,
        productCount: child._count.products,
      }));
      const childrenCount = children.reduce((sum, c) => sum + c.productCount, 0);
      return {
        id: parent.id,
        name: parent.name,
        slug: parent.slug,
        icon: parent.icon,
        imageUrl: parent.imageUrl,
        productCount: parent._count.products + childrenCount,
        children,
      };
    });
}

export async function getCategoryAttributes(categoryId: number) {
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) throw ApiError.notFound('Categoría no encontrada');

  return prisma.attributeDefinition.findMany({
    where: { OR: [{ categoryId }, { categoryId: null }] },
    orderBy: { order: 'asc' },
  });
}
