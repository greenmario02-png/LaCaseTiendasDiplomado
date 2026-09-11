import { describe, it, expect, jest } from '@jest/globals';
import { render, fireEvent } from '@testing-library/react-native';
import React from 'react';
import { ProductCard } from './ProductCard';

describe('ProductCard', () => {
  const base = {
    id: 1,
    name: 'AMD Ryzen 9 7950X3D',
    price: 13545.04,
    stock: 20,
    storeName: 'Gislason - Kreiger',
  };

  it('muestra nombre, precio y tienda, y dispara onAddToCart', async () => {
    const onAddToCart = jest.fn();
    const { getByText, getAllByText } = await render(
      <ProductCard {...base} onAddToCart={onAddToCart} />,
    );
    expect(getByText(/AMD Ryzen 9 7950X3D/)).toBeTruthy();
    expect(getByText(/Gislason - Kreiger/)).toBeTruthy();
    expect(getAllByText(/Bs 13\.545,04/).length).toBeGreaterThan(0);
    fireEvent.press(getByText(/Agregar al carrito/));
    expect(onAddToCart).toHaveBeenCalledTimes(1);
  });

  it('muestra Sin stock y no permite agregar cuando stock es 0', async () => {
    const onAddToCart = jest.fn();
    const { getAllByText } = await render(
      <ProductCard {...base} stock={0} onAddToCart={onAddToCart} />,
    );
    expect(getAllByText(/Sin stock/).length).toBeGreaterThanOrEqual(2);
  });
});
