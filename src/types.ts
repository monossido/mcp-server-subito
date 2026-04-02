export interface NormalizedLocation {
  display: string;
  town: string | null;
  provinceName: string | null;
  provinceCode: string | null;
  regionName: string | null;
}

export interface ListingAttributes {
  brand: string | null;
  model: string | null;
  variant: string | null;
  condition: string | null;
  year: string | null;
  registration: string | null;
  mileageText: string | null;
  mileageKm: number | null;
  fuel: string | null;
  transmission: string | null;
  bodyType: string | null;
}

export interface Listing {
  id: string;
  title: string;
  price: string | null;
  priceAmount: number | null;
  currency: "EUR" | null;
  location: string;
  locationData: NormalizedLocation;
  url: string;
  imageUrl: string | null;
  imageCount: number;
  date: string | null;
  category: string | null;
  advertiser: string | null;
  sellerType: "private" | "professional" | null;
  listingType: string | null;
  shipping: boolean;
  attributes: ListingAttributes;
}

export interface ListingDetails {
  id: string;
  title: string;
  description: string;
  descriptionLines: string[];
  price: string | null;
  priceAmount: number | null;
  currency: "EUR" | null;
  location: string;
  locationData: NormalizedLocation;
  date: string | null;
  category: string | null;
  categoryPath: string[];
  images: string[];
  imageCount: number;
  advertiser: AdvertiserInfo | null;
  sellerType: "private" | "professional" | null;
  features: Record<string, string>;
  attributes: ListingAttributes;
  url: string;
}

export interface AdvertiserInfo {
  name: string;
  type: "private" | "professional" | null;
  phone: string | null;
}

export interface SearchParams {
  query?: string;
  category?: number;
  region?: number;
  province?: number;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: SortOrder;
  startPage?: number;
}

export type SortOrder = "relevance" | "date_desc" | "price_asc" | "price_desc";

export interface SearchResult {
  listings: Listing[];
  totalCount: number | null;
  startPage: number;
  totalPages: number | null;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  subcategories?: Category[];
}

export interface Region {
  id: number;
  name: string;
  provinces?: Province[];
}

export interface Province {
  id: number;
  name: string;
  shortCode: string;
}

export const SORT_ORDER_MAP: Record<SortOrder, string | undefined> = {
  relevance: undefined,
  date_desc: "datedesc",
  price_asc: "priceasc",
  price_desc: "pricedesc",
};
