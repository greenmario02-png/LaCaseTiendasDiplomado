/** Construye la URL de un producto con su slug a partir del nombre (patrón /producto/:id/:slug). */
export function productUrl(product: { id: number; name: string }): string {
  const slug = product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return `/producto/${product.id}/${slug}`;
}
