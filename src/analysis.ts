import type { Listing, ListingDetails } from "./types.js";

export interface FacetBucket {
  value: string;
  count: number;
}

export interface SearchFacets {
  categories: FacetBucket[];
  regions: FacetBucket[];
  provinces: FacetBucket[];
  sellerTypes: FacetBucket[];
  shipping: FacetBucket[];
  price: {
    min: number | null;
    max: number | null;
    avg: number | null;
    count: number;
  };
}

export interface ComparisonRow {
  field: string;
  values: Array<string | null>;
}

export interface ComparableListing {
  listing: Listing;
  score: number;
  signals: string[];
}

function countBuckets(values: Array<string | null>): FacetBucket[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

export function buildSearchFacets(listings: Listing[]): SearchFacets {
  const prices = listings
    .map((listing) => listing.priceAmount)
    .filter((value): value is number => value !== null);
  const sum = prices.reduce((acc, value) => acc + value, 0);

  return {
    categories: countBuckets(listings.map((listing) => listing.category)),
    regions: countBuckets(
      listings.map((listing) => listing.locationData.regionName)
    ),
    provinces: countBuckets(
      listings.map(
        (listing) =>
          listing.locationData.provinceName ?? listing.locationData.provinceCode
      )
    ),
    sellerTypes: countBuckets(listings.map((listing) => listing.sellerType)),
    shipping: countBuckets(
      listings.map((listing) => (listing.shipping ? "available" : "not_available"))
    ),
    price: {
      min: prices.length > 0 ? Math.min(...prices) : null,
      max: prices.length > 0 ? Math.max(...prices) : null,
      avg: prices.length > 0 ? Math.round(sum / prices.length) : null,
      count: prices.length,
    },
  };
}

export function buildComparisonRows(listings: ListingDetails[]): ComparisonRow[] {
  const mapField = (
    field: string,
    getter: (listing: ListingDetails) => string | null
  ): ComparisonRow => ({
    field,
    values: listings.map(getter),
  });

  return [
    mapField("title", (listing) => listing.title),
    mapField("price", (listing) =>
      listing.priceAmount !== null ? String(listing.priceAmount) : listing.price
    ),
    mapField("location", (listing) => listing.location),
    mapField("sellerType", (listing) => listing.sellerType),
    mapField("brand", (listing) => listing.attributes.brand),
    mapField("model", (listing) => listing.attributes.model),
    mapField("variant", (listing) => listing.attributes.variant),
    mapField("year", (listing) => listing.attributes.year),
    mapField("mileageKm", (listing) =>
      listing.attributes.mileageKm !== null
        ? String(listing.attributes.mileageKm)
        : listing.attributes.mileageText
    ),
    mapField("condition", (listing) => listing.attributes.condition),
    mapField("imageCount", (listing) => String(listing.imageCount)),
  ];
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

export function deriveComparableQuery(reference: ListingDetails): string {
  const tokens = [
    reference.attributes.brand,
    reference.attributes.model,
    reference.attributes.variant,
  ].filter(Boolean);

  if (tokens.length > 0) {
    return tokens.join(" ");
  }

  return reference.title;
}

export function rankComparableListings(
  reference: ListingDetails,
  candidates: Listing[],
  limit: number
): ComparableListing[] {
  const referenceTitle = normalizeText(reference.title);
  const referenceBrand = normalizeText(reference.attributes.brand ?? "");
  const referenceModel = normalizeText(reference.attributes.model ?? "");
  const referenceCategory = reference.category;
  const referenceProvince =
    reference.locationData.provinceName ?? reference.locationData.provinceCode;
  const referenceRegion = reference.locationData.regionName;

  return candidates
    .filter((candidate) => candidate.id !== reference.id)
    .map((candidate) => {
      let score = 0;
      const signals: string[] = [];

      const candidateTitle = normalizeText(candidate.title);
      const candidateBrand = normalizeText(candidate.attributes.brand ?? "");
      const candidateModel = normalizeText(candidate.attributes.model ?? "");

      if (referenceCategory && candidate.category === referenceCategory) {
        score += 3;
        signals.push("same_category");
      }
      if (referenceBrand && candidateBrand === referenceBrand) {
        score += 4;
        signals.push("same_brand");
      }
      if (referenceModel && candidateModel === referenceModel) {
        score += 5;
        signals.push("same_model");
      }
      if (!referenceModel && candidateTitle.includes(referenceTitle)) {
        score += 3;
        signals.push("title_overlap");
      }

      const candidateProvince =
        candidate.locationData.provinceName ?? candidate.locationData.provinceCode;
      if (referenceProvince && candidateProvince === referenceProvince) {
        score += 2;
        signals.push("same_province");
      } else if (
        referenceRegion &&
        candidate.locationData.regionName === referenceRegion
      ) {
        score += 1;
        signals.push("same_region");
      }

      if (
        reference.priceAmount !== null &&
        candidate.priceAmount !== null &&
        reference.priceAmount > 0
      ) {
        const delta =
          Math.abs(candidate.priceAmount - reference.priceAmount) /
          reference.priceAmount;
        if (delta <= 0.1) {
          score += 3;
          signals.push("price_within_10pct");
        } else if (delta <= 0.2) {
          score += 2;
          signals.push("price_within_20pct");
        } else if (delta <= 0.35) {
          score += 1;
          signals.push("price_within_35pct");
        }
      }

      return { listing: candidate, score, signals };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score || a.listing.title.localeCompare(b.listing.title))
    .slice(0, limit);
}
