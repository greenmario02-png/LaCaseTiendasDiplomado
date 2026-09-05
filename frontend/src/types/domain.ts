/**
 * Tipos de dominio compartidos del frontend.
 * Centraliza las interfaces usadas en múltiples páginas/componentes
 * para eliminar el uso disperso de `any`.
 */

export interface SellerBrief {
  id: number;
  storeName: string;
  rating: number;
  locationCity?: string | null;
  locationState?: string | null;
  country?: string | null;
  isVerified?: boolean;
  storeCategory?: string | null;
  totalSales?: number;
}

export interface ProductImage {
  id?: number;
  url: string;
  isPrimary?: boolean;
  order?: number;
}

export interface Product {
  id: number;
  name: string;
  slug?: string;
  price: string | number;
  originalPrice?: string | number | null;
  stock: number;
  condition?: 'NEW' | 'USED' | 'REFURBISHED';
  conditionScore?: number | null;
  brand?: string | null;
  description?: string | null;
  warrantyInfo?: string | null;
  deliveryTypes?: string[];
  acceptsTrade?: boolean;
  saleCount?: number;
  viewCount?: number;
  viewingNow?: number;
  images?: ProductImage[];
  seller: SellerBrief;
  category?: { id: number; name: string; slug: string };
  tags?: Array<{ tag: { name: string; slug: string } }>;
  isFeatured?: boolean;
}

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'SELLER' | 'CUSTOMER';
  storeName?: string | null;
  isApproved?: boolean;
  isActive?: boolean;
  gamerCoins?: number;
  phone?: string | null;
  locationCity?: string | null;
  locationState?: string | null;
  locationPostalCode?: string | null;
  country?: string | null;
  storeCategory?: string | null;
  paymentQrUrl?: string | null;
  forumProfile?: {
    id: number;
    forumUsername: string;
    karma: number;
    karmaSpent?: number;
    tag: string;
    city: string;
  } | null;
}

export interface OrderItem {
  id: number;
  product: Product;
  quantity: number;
  unitPrice: string | number;
}

export interface Order {
  id: number;
  status: string;
  paymentStatus: string;
  subtotal: string | number;
  shippingCost?: string | number | null;
  total: string | number;
  commission?: string | number | null;
  sellerNet?: string | number | null;
  createdAt: string;
  items: OrderItem[];
  seller: { id: number; storeName: string; paymentQrUrl?: string | null };
  buyer?: { id: number; firstName: string; lastName: string; email: string };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiListResponse<T> {
  data: T[];
  meta: PaginationMeta;
}
