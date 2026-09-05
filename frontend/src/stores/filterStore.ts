import { create } from 'zustand';

export interface Filters {
  search?: string;
  categoryId?: number;
  minPrice?: number;
  maxPrice?: number;
  condition?: string;
  location?: string;
  tag?: string;
  sort?: string;
}

interface FilterState {
  filters: Filters;
  setFilter: (key: keyof Filters, value: string | number | undefined) => void;
  clearFilters: () => void;
  syncFromUrl: (params: URLSearchParams) => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  filters: {},

  setFilter: (key, value) =>
    set((state) => ({
      filters: {
        ...state.filters,
        [key]: value === undefined || value === '' ? undefined : value,
      },
    })),

  clearFilters: () => set({ filters: {} }),

  syncFromUrl: (params) => {
    const filters: Filters = {};
    const search = params.get('search');
    if (search) filters.search = search;
    const categoryId = params.get('categoryId');
    if (categoryId) filters.categoryId = Number(categoryId);
    const minPrice = params.get('minPrice');
    if (minPrice) filters.minPrice = Number(minPrice);
    const maxPrice = params.get('maxPrice');
    if (maxPrice) filters.maxPrice = Number(maxPrice);
    const condition = params.get('condition');
    if (condition) filters.condition = condition;
    const location = params.get('location');
    if (location) filters.location = location;
    const tag = params.get('tag');
    if (tag) filters.tag = tag;
    const sort = params.get('sort');
    if (sort) filters.sort = sort;
    set({ filters });
  },
}));
