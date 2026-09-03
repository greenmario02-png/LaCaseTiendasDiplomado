// Giphy proxy server-side (09-spec G4.2). Sin API key devuelve [] sin romper.

export interface GifResult {
  id: string;
  url: string;
  previewUrl: string;
  title: string;
}

const GIPHY_API_BASE = 'https://api.giphy.com/v1/gifs/search';

export async function searchGifs(q: string, limit: number): Promise<GifResult[]> {
  const apiKey = process.env.GIPHY_API_KEY ?? '';
  if (!apiKey || !q.trim()) return [];

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const params = new URLSearchParams({ api_key: apiKey, q: q.trim(), limit: String(Math.min(limit || 12, 25)), rating: 'g' });
    const res = await fetch(`${GIPHY_API_BASE}?${params.toString()}`, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: Array<{ id?: string; images?: { original?: { url?: string }; fixed_height_small?: { url?: string } }; title?: string }> };
    return (json.data ?? [])
      .filter((g) => g?.images?.original?.url)
      .map((g) => ({
        id: g.id ?? String(Math.random()),
        url: g.images!.original!.url as string,
        previewUrl: g.images?.fixed_height_small?.url ?? (g.images!.original!.url as string),
        title: g.title ?? '',
      }));
  } catch {
    return [];
  }
}
