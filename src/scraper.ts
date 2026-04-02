import * as cheerio from "cheerio";
import { z } from "zod";
import type {
  Listing,
  ListingDetails,
  SearchParams,
  SearchResult,
  AdvertiserInfo,
} from "./types.js";
import { SORT_ORDER_MAP } from "./types.js";
import { getProvinceById, getRegionById } from "./data/regions.js";
import { config } from "./config.js";
import {
  buildCategoryPath,
  inferAttributes,
  normalizeAdvertiser,
  normalizeLocation,
  parsePriceAmount,
  splitDescriptionLines,
} from "./listing-normalization.js";
import {
  BASE_URL,
  ensureSubitoUrl,
  fetchSubitoPage,
} from "./subito-http.js";

function slugifyLocation(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const searchItemsSchema = z.object({
  list: z.array(z.unknown()).default([]),
  total: z.number().nullable().optional(),
  totalPages: z.number().nullable().optional(),
});

const searchNextDataSchema = z.object({
  props: z.object({
    pageProps: z.object({
      initialState: z.object({
        items: searchItemsSchema,
      }),
    }),
  }),
});

const listingDetailsSchema = z.object({
  urn: z.string().optional(),
  subject: z.string(),
  body: z.string().optional(),
  date: z.string().nullable().optional(),
  category: z
    .object({
      label: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  geo: z.record(z.string(), z.unknown()).optional(),
  features: z.record(z.string(), z.unknown()).optional(),
  images: z
    .array(
      z.object({
        cdnBaseUrl: z.string().optional(),
      })
    )
    .optional(),
  advertiser: z
    .object({
      name: z.string().optional(),
      company: z.boolean().optional(),
      type: z.number().optional(),
      phone: z.string().nullable().optional(),
    })
    .optional(),
  urls: z
    .object({
      default: z.string().optional(),
    })
    .optional(),
});

const detailsNextDataSchema = z.object({
  props: z.object({
    pageProps: z.object({
      ad: listingDetailsSchema,
    }),
  }),
});

function extractNextData(html: string): Record<string, unknown> | null {
  const $ = cheerio.load(html);
  const scriptTag = $('script#__NEXT_DATA__[type="application/json"]');

  if (scriptTag.length === 0) return null;

  try {
    return JSON.parse(scriptTag.text()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function findMatchingJsonObjectEnd(source: string, startIndex: number): number {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = startIndex; i < source.length; i += 1) {
    const char = source[i];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return i;
      }
    }
  }

  return -1;
}

function extractPlainListingObject(
  source: string
): z.infer<typeof listingDetailsSchema> | null {
  const anchor = "\"subject\":";
  let searchIndex = source.indexOf(anchor);

  while (searchIndex !== -1) {
    const minStart = Math.max(0, searchIndex - 4000);

    for (let start = searchIndex; start >= minStart; start -= 1) {
      if (source[start] !== "{") continue;

      const end = findMatchingJsonObjectEnd(source, start);
      if (end === -1 || end < searchIndex) continue;

      const candidate = source.slice(start, end + 1);

      try {
        const parsed = JSON.parse(candidate) as unknown;
        const result = listingDetailsSchema.safeParse(parsed);
        if (
          result.success &&
          (result.data.urls?.default || result.data.subject) &&
          (result.data.body !== undefined || result.data.features !== undefined)
        ) {
          return result.data;
        }
      } catch {
        continue;
      }
    }

    searchIndex = source.indexOf(anchor, searchIndex + anchor.length);
  }

  return null;
}

function extractEmbeddedListingObject(
  html: string
): z.infer<typeof listingDetailsSchema> | null {
  const plainObject = extractPlainListingObject(html);
  if (plainObject) return plainObject;

  const $ = cheerio.load(html);
  const scriptContents = $("script")
    .map((_, element) => $(element).html() ?? "")
    .get()
    .filter((content) => content.includes("self.__next_f.push"));

  const jsStringPattern = /"((?:\\.|[^"\\])*)"/g;

  for (const content of scriptContents) {
    for (const match of content.matchAll(jsStringPattern)) {
      try {
        const decoded = JSON.parse(match[0]) as string;
        if (!decoded.includes("\"subject\":")) continue;

        const decodedObject = extractPlainListingObject(decoded);
        if (decodedObject) {
          return decodedObject;
        }
      } catch {
        continue;
      }
    }
  }

  return null;
}

function getSearchItems(nextData: Record<string, unknown>):
  | z.infer<typeof searchItemsSchema>
  | null {
  const parsed = searchNextDataSchema.safeParse(nextData);
  if (!parsed.success) return null;
  return parsed.data.props.pageProps.initialState.items;
}

function getDetailsItem(nextData: Record<string, unknown>):
  | z.infer<typeof listingDetailsSchema>
  | null {
  const parsed = detailsNextDataSchema.safeParse(nextData);
  if (!parsed.success) return null;
  return parsed.data.props.pageProps.ad;
}

function buildSearchUrl(params: SearchParams): string {
  let path = "/annunci-italia/vendita/usato/";

  if (params.province) {
    const provinceData = getProvinceById(params.province);
    if (provinceData) {
      path = `/annunci-${slugifyLocation(provinceData.region.name)}/vendita/usato/${slugifyLocation(provinceData.province.name)}/`;
    }
  } else if (params.region) {
    const region = getRegionById(params.region);
    if (region) {
      path = `/annunci-${slugifyLocation(region.name)}/vendita/usato/`;
    }
  }

  const url = new URL(path, BASE_URL);

  if (params.query) url.searchParams.set("q", params.query);
  if (params.category) url.searchParams.set("c", String(params.category));
  if (params.minPrice) url.searchParams.set("ps", String(params.minPrice));
  if (params.maxPrice) url.searchParams.set("pe", String(params.maxPrice));
  if (params.startPage && params.startPage > 1)
    url.searchParams.set("o", String(params.startPage));

  if (params.sort) {
    const sortValue = SORT_ORDER_MAP[params.sort];
    if (sortValue) url.searchParams.set("order", sortValue);
  }

  return url.toString();
}

function extractPrice(
  features: Record<string, unknown> | undefined
): string | null {
  if (!features) return null;
  const priceFeature = features["/price"] as
    | { values?: Array<{ value?: string }> }
    | undefined;
  return priceFeature?.values?.[0]?.value ?? null;
}

function extractShippingAvailable(
  features: Record<string, unknown> | undefined
): boolean {
  if (!features) return false;
  const shipping = features["/item_shipping_allowed"] as
    | { values?: Array<{ key?: string }> }
    | undefined;
  return shipping?.values?.[0]?.key === "1";
}

function extractGeoLocation(geo: Record<string, unknown> | undefined): string {
  return normalizeLocation(geo).display;
}

function parseItemFromNextData(entry: Record<string, unknown>): Listing | null {
  const rawItem =
    "item" in entry && typeof entry.item === "object" && entry.item
      ? (entry.item as Record<string, unknown>)
      : entry;
  const urn = typeof rawItem.urn === "string" ? rawItem.urn : null;
  if (!urn) return null;

  const idMatch = urn.match(/:(\d+)$/);
  const id = idMatch?.[1] ?? urn;
  const item = rawItem as Record<string, any>;
  const featureMap = extractFeaturesMap(item.features);
  const locationData = normalizeLocation(item.geo);
  const { sellerType } = normalizeAdvertiser(item.advertiser);
  const price = extractPrice(item.features);

  return {
    id,
    title: item.subject ?? "",
    price,
    priceAmount: parsePriceAmount(price),
    currency: price ? "EUR" : null,
    location: locationData.display,
    locationData,
    url: item.urls?.default ?? "",
    imageUrl: item.images?.[0]?.cdnBaseUrl
      ? `${item.images[0].cdnBaseUrl}?rule=card-desktop-new-small-2x-auto`
      : null,
    imageCount: Array.isArray(item.images) ? item.images.length : 0,
    date: item.date ?? null,
    category: item.category?.label ?? null,
    advertiser: item.advertiser?.name || null,
    sellerType,
    listingType: item.type?.value ?? null,
    shipping: extractShippingAvailable(item.features),
    attributes: inferAttributes(featureMap),
  };
}

export async function searchListings(
  params: SearchParams
): Promise<SearchResult> {
  const url = buildSearchUrl(params);
  const html = await fetchSubitoPage(url);
  const nextData = extractNextData(html);

  if (!nextData) {
        return {
          listings: [],
          totalCount: null,
          startPage: params.startPage ?? 1,
          totalPages: null,
        };
  }

  const itemsData = getSearchItems(nextData);
  if (!itemsData) {
        return {
          listings: [],
          totalCount: null,
          startPage: params.startPage ?? 1,
          totalPages: null,
        };
  }

  const rawList = itemsData.list as Array<Record<string, unknown>>;
  const listings = rawList
    .map((entry) => parseItemFromNextData(entry))
    .filter((l): l is Listing => l !== null);

  return {
    listings,
    totalCount: (itemsData.total as number) ?? null,
    startPage: params.startPage ?? 1,
    totalPages: (itemsData.totalPages as number) ?? null,
  };
}

export interface SearchScanResult extends SearchResult {
  pagesScanned: number;
  truncated: boolean;
}

export async function searchListingsAcrossPages(
  params: SearchParams,
  options?: {
    maxPages?: number;
    allowPagination?: boolean;
  }
): Promise<SearchScanResult> {
  const firstPage = params.startPage ?? 1;
  const firstResult = await searchListings({
    ...params,
    startPage: firstPage,
  });

  const canPaginate = options?.allowPagination ?? config.ignoreRobotsTxt;
  const totalPages = firstResult.totalPages ?? firstPage;
  const requestedMaxPages = options?.maxPages ?? 20;
  const effectiveMaxPages = Math.max(1, requestedMaxPages);
  const pagesToFetch = canPaginate
    ? Math.max(
        1,
        Math.min(
          effectiveMaxPages,
          totalPages - firstPage + 1
        )
      )
    : 1;

  if (pagesToFetch === 1) {
    return {
      ...firstResult,
      pagesScanned: 1,
      truncated: canPaginate
        ? totalPages > firstPage
        : (firstResult.totalPages ?? 1) > 1,
    };
  }

  const results = [firstResult];
  for (let pageOffset = 1; pageOffset < pagesToFetch; pageOffset += 1) {
    const page = firstPage + pageOffset;
    const result = await searchListings({
      ...params,
      startPage: page,
    });
    results.push(result);
  }

  const dedupedListings = new Map<string, SearchResult["listings"][number]>();
  for (const result of results) {
    for (const listing of result.listings) {
      if (!dedupedListings.has(listing.id)) {
        dedupedListings.set(listing.id, listing);
      }
    }
  }

  return {
    listings: [...dedupedListings.values()],
    totalCount: firstResult.totalCount,
    startPage: firstResult.startPage,
    totalPages: firstResult.totalPages,
    pagesScanned: results.length,
    truncated:
      firstResult.totalPages !== null
        ? firstResult.startPage + results.length - 1 < firstResult.totalPages
        : false,
  };
}

function extractFeaturesMap(
  features: Record<string, unknown> | undefined
): Record<string, string> {
  if (!features) return {};
  const result: Record<string, string> = {};

  for (const [key, feature] of Object.entries(features)) {
    const f = feature as {
      label?: string;
      values?: Array<{ value?: string }>;
    };
    if (f?.label && f.values?.[0]?.value) {
      result[f.label] = f.values[0].value;
    }
  }

  return result;
}

export async function getListingDetails(
  listingUrl: string
): Promise<ListingDetails | null> {
  const url = ensureSubitoUrl(listingUrl).toString();

  const html = await fetchSubitoPage(url);
  const nextData = extractNextData(html);
  const item = nextData ? getDetailsItem(nextData) : extractEmbeddedListingObject(html);
  if (!item) return null;

  const idMatch = (item.urn ?? "").match(/:(\d+)$/);
  const id = idMatch?.[1] ?? item.urn ?? "";

  const images = (item.images ?? [])
    .map((img) =>
      img.cdnBaseUrl ? `${img.cdnBaseUrl}?rule=gallery-desktop-2x-auto` : ""
    )
    .filter(Boolean);

  const advertiserData = item.advertiser;
  const { advertiser, sellerType } = normalizeAdvertiser(
    advertiserData as Record<string, unknown> | undefined
  );
  const price = extractPrice(item.features);
  const locationData = normalizeLocation(item.geo);
  const attributes = inferAttributes(extractFeaturesMap(item.features));
  const description = item.body ?? "";

  return {
    id,
    title: item.subject,
    description,
    descriptionLines: splitDescriptionLines(description),
    price,
    priceAmount: parsePriceAmount(price),
    currency: price ? "EUR" : null,
    location: locationData.display,
    locationData,
    date: item.date ?? null,
    category: item.category?.label ?? null,
    categoryPath: buildCategoryPath(item.category?.label ?? null),
    images,
    imageCount: images.length,
    advertiser,
    sellerType,
    features: extractFeaturesMap(item.features),
    attributes,
    url,
  };
}
