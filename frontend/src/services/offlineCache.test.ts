import { describe, it, expect, beforeEach } from 'vitest';
import { isCacheable, cacheSet, cacheGet, cacheRemove, queuePush, queueList, queueRemove, queueClear, cartCacheSet, cartCacheGet } from './offlineCache';

describe('offlineCache web', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('isCacheable detecta URLs de catálogo', () => {
    expect(isCacheable('/products?page=1')).toBe(true);
    expect(isCacheable('/products/317')).toBe(true);
    expect(isCacheable('/products/categories')).toBe(true);
    expect(isCacheable('/banners')).toBe(true);
    expect(isCacheable('/currencies')).toBe(true);
    expect(isCacheable('/forum/posts')).toBe(true);
    expect(isCacheable('/sellers/110')).toBe(true);
    expect(isCacheable('/cart')).toBe(false);
    expect(isCacheable('/auth/login')).toBe(false);
    expect(isCacheable('http://external.com/x')).toBe(false);
  });

  it('cacheSet/cacheGet guarda y recupera respuestas', () => {
    const data = { data: [{ id: 317, name: 'AMD Ryzen 7 7800X3D', price: '450.00' }] };
    cacheSet('/products?page=1', data);
    const got = cacheGet<typeof data>('/products?page=1');
    expect(got).toEqual(data);
    expect(cacheGet('/nada')).toBeNull();
  });

  it('cacheRemove elimina la entrada', () => {
    cacheSet('/banners', { ok: true });
    cacheRemove('/banners');
    expect(cacheGet('/banners')).toBeNull();
  });

  it('cola offline: push/list/remove/clear', () => {
    queuePush({ method: 'post', url: '/cart/items', data: { productId: 1, quantity: 2 } });
    queuePush({ method: 'put', url: '/cart/items/5', data: { quantity: 3 } });
    let q = queueList();
    expect(q).toHaveLength(2);
    expect(q[0].method).toBe('post');
    expect(q[0].url).toBe('/cart/items');
    expect(q[0].data).toEqual({ productId: 1, quantity: 2 });

    queueRemove(q[0].id);
    q = queueList();
    expect(q).toHaveLength(1);
    expect(q[0].url).toBe('/cart/items/5');

    queueClear();
    expect(queueList()).toHaveLength(0);
  });

  it('carrito offline: cartCacheSet/cartCacheGet', () => {
    const cart = { cartId: 48, items: [{ id: 50, quantity: 1 }], subtotal: 100, itemCount: 1, groupedBySeller: [] };
    cartCacheSet(cart);
    const got = cartCacheGet<typeof cart>();
    expect(got?.cartId).toBe(48);
    expect(got?.itemCount).toBe(1);
  });
});
