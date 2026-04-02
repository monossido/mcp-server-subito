import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { buildSearchFacets } from "../analysis.js";
import { searchListings, searchListingsAcrossPages } from "../scraper.js";
import type { Listing, SortOrder } from "../types.js";
import { listingSchema } from "./shared.js";

const facetBucketSchema = z.object({
  value: z.string(),
  count: z.number(),
});

const searchOutputSchema = {
  filters: z.object({
    query: z.string().optional(),
    category: z.number().optional(),
    region: z.number().optional(),
    province: z.number().optional(),
    minPrice: z.number().optional(),
    maxPrice: z.number().optional(),
    sort: z
      .enum(["relevance", "date_desc", "price_asc", "price_desc"])
      .optional(),
    startPage: z.number(),
  }),
  pagination: z.object({
    startPage: z.number(),
    totalPages: z.number().nullable(),
    totalCount: z.number().nullable(),
  }),
  scan: z.object({
    pagesScanned: z.number(),
    endPage: z.number(),
    truncated: z.boolean(),
  }),
  listings: z.array(listingSchema),
  facets: z
    .object({
      categories: z.array(facetBucketSchema),
      regions: z.array(facetBucketSchema),
      provinces: z.array(facetBucketSchema),
      sellerTypes: z.array(facetBucketSchema),
      shipping: z.array(facetBucketSchema),
      price: z.object({
        min: z.number().nullable(),
        max: z.number().nullable(),
        avg: z.number().nullable(),
        count: z.number(),
      }),
    })
    .optional(),
};

function formatListing(listing: Listing, index: number): string {
  const parts = [`${index + 1}. **${listing.title}**`];

  if (listing.price) parts.push(`   Price: ${listing.price}`);
  if (listing.location) parts.push(`   Location: ${listing.location}`);
  if (listing.category) parts.push(`   Category: ${listing.category}`);
  if (listing.date) parts.push(`   Date: ${listing.date}`);
  if (listing.shipping) parts.push(`   Shipping: available`);
  parts.push(`   URL: ${listing.url}`);

  return parts.join("\n");
}

export function registerSearchTools(server: McpServer): void {
  server.registerTool(
    "search_listings",
    {
      description:
        "Search listings on subito.it. Returns matching ads with normalized price, seller, location, and attribute data. " +
        "By default fetches a single page fast. Set maxPages > 1 to scan multiple pages. " +
        "Set includeFacets: true to add aggregated market analysis (category/region/price distribution) on top of listings.",
      inputSchema: {
        query: z
          .string()
          .optional()
          .describe("Search keywords (e.g. 'iphone', 'bicicletta', 'divano')"),
        category: z
          .number()
          .optional()
          .describe(
            "Category ID to filter by. Use list_categories to see available IDs."
          ),
        region: z
          .number()
          .optional()
          .describe(
            "Region ID to filter by location. Use list_regions to see available IDs."
          ),
        province: z
          .number()
          .optional()
          .describe(
            "Province ID for more specific location filtering. Use list_regions to see available IDs."
          ),
        minPrice: z.number().optional().describe("Minimum price in euros"),
        maxPrice: z.number().optional().describe("Maximum price in euros"),
        sort: z
          .enum(["relevance", "date_desc", "price_asc", "price_desc"])
          .optional()
          .describe(
            "Sort order: 'relevance' (default), 'date_desc' (newest first), 'price_asc' (cheapest first), 'price_desc' (most expensive first)"
          ),
        startPage: z
          .number()
          .optional()
          .describe("Start page for the search (default: 1)."),
        maxPages: z
          .number()
          .min(1)
          .max(50)
          .optional()
          .describe(
            "Maximum number of pages to scan (default: 1). Additional pages beyond 1 require the server to run with --ignore-robots-txt."
          ),
        includeFacets: z
          .boolean()
          .optional()
          .describe(
            "When true, compute aggregated facets (category, region, province, seller type, shipping, price distribution) over the scanned listings. Default: false."
          ),
        sellerType: z
          .enum(["private", "professional"])
          .optional()
          .describe(
            "Filter by seller type: 'private' for individuals, 'professional' for businesses/dealers. " +
            "Applied client-side after fetching — totalCount reflects the unfiltered server total. " +
            "Use maxPages > 1 to get a larger sample before filtering."
          ),
      },
      outputSchema: searchOutputSchema,
    },
    async ({
      query,
      category,
      region,
      province,
      minPrice,
      maxPrice,
      sort,
      startPage,
      maxPages,
      includeFacets,
      sellerType,
    }) => {
      try {
        const multiPage = (maxPages ?? 1) > 1 || (includeFacets ?? false);

        let listings: Listing[];
        let resultStartPage: number;
        let totalPages: number | null;
        let totalCount: number | null;
        let pagesScanned: number;
        let truncated: boolean;

        if (multiPage) {
          const result = await searchListingsAcrossPages(
            {
              query,
              category,
              region,
              province,
              minPrice,
              maxPrice,
              sort: sort as SortOrder | undefined,
              startPage,
            },
            { maxPages }
          );
          listings = result.listings;
          resultStartPage = result.startPage;
          totalPages = result.totalPages;
          totalCount = result.totalCount;
          pagesScanned = result.pagesScanned;
          truncated = result.truncated;
        } else {
          const result = await searchListings({
            query,
            category,
            region,
            province,
            minPrice,
            maxPrice,
            sort: sort as SortOrder | undefined,
            startPage,
          });
          listings = result.listings;
          resultStartPage = result.startPage;
          totalPages = result.totalPages;
          totalCount = result.totalCount;
          pagesScanned = 1;
          truncated =
            result.totalPages !== null
              ? result.startPage < result.totalPages
              : false;
        }

        if (sellerType) {
          listings = listings.filter((l) => l.sellerType === sellerType);
        }

        if (listings.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: "No listings found matching your search criteria. Try broadening your search or removing some filters.",
              },
            ],
          };
        }

        const facets =
          includeFacets ? buildSearchFacets(listings) : undefined;

        const structuredContent = {
          filters: {
            query,
            category,
            region,
            province,
            minPrice,
            maxPrice,
            sort: sort as SortOrder | undefined,
            startPage: resultStartPage,
          },
          pagination: {
            startPage: resultStartPage,
            totalPages,
            totalCount,
          },
          scan: {
            pagesScanned,
            endPage: resultStartPage + pagesScanned - 1,
            truncated,
          },
          listings,
          facets,
        };

        const listingsText = listings
          .map((l: Listing, i: number) => formatListing(l, i))
          .join("\n\n");

        const pagination = [
          `Start page ${resultStartPage}`,
          totalPages ? `of ${totalPages}` : "",
          totalCount
            ? `(${totalCount.toLocaleString("it-IT")} total results)`
            : "",
        ]
          .filter(Boolean)
          .join(" ");

        const sellerNote = sellerType
          ? ` (filtered: ${sellerType} sellers only)`
          : "";

        const scanNote =
          pagesScanned > 1
            ? ` — ${listings.length} listings across ${pagesScanned} page(s)${truncated ? " (truncated)" : ""}${sellerNote}`
            : truncated
              ? `\n\nMore pages available.${sellerNote}`
              : sellerNote ? `\n\n${sellerNote.trim()}` : "";

        const facetsText =
          facets
            ? `\n\nFacets:\n` +
              `  Top categories: ${facets.categories.slice(0, 5).map((b) => `${b.value} (${b.count})`).join(", ") || "none"}\n` +
              `  Top regions: ${facets.regions.slice(0, 5).map((b) => `${b.value} (${b.count})`).join(", ") || "none"}\n` +
              (facets.price.avg !== null
                ? `  Price: avg €${facets.price.avg.toFixed(0)}, min €${facets.price.min}, max €${facets.price.max} (${facets.price.count} priced)\n`
                : "")
            : "";

        return {
          content: [
            {
              type: "text" as const,
              text: `${pagination}${scanNote}\n\n${listingsText}${facetsText}`,
            },
          ],
          structuredContent,
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        return {
          content: [
            {
              type: "text" as const,
              text: `Error searching listings: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
