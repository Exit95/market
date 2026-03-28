import { api } from '@/lib/api';

export interface ListingFilters {
  search?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: string;
  shippingAvailable?: boolean;
  pickupAvailable?: boolean;
  verifiedSeller?: boolean;
  sortBy?: 'newest' | 'price_asc' | 'price_desc';
  page?: number;
  limit?: number;
}

export const listingService = {
  async getListings(filters: ListingFilters = {}) {
    const { data } = await api.get('/listings', { params: filters });
    return data;
  },

  async getListing(id: string) {
    const { data } = await api.get(`/listings/${id}`);
    return data;
  },

  async createListing(listing: any) {
    const { data } = await api.post('/listings', listing);
    return data;
  },

  async updateListing(id: string, updates: any) {
    const { data } = await api.put(`/listings/${id}`, updates);
    return data;
  },

  async deleteListing(id: string) {
    const { data } = await api.delete(`/listings/${id}`);
    return data;
  },
};
