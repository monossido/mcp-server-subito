import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  deriveComparableQuery,
  rankComparableListings,
} from "../analysis.js";
import { getListingDetails, searchListingsAcrossPages } from "../scraper.js";
import { listingDetailsSchema, listingSchema } from "./shared.js";

const comparableSchema = z.object({
  listing: listingSchema,
  score: z.number(),
  signals: z.array(z.string()),
});

export function registerComparableTools(server: McpServer): void {
  server.registerTool(
    "find_comparable_listings",
    {
      description:
        "Use a reference listing to retrieve structurally similar listings. This tool is better than a plain keyword search when you need comparable candidates around one ad, because it derives a query, can scan multiple pages, and returns explicit matching signals rather than a generic result list.",
      inputSchema: {
        listingUrl: z
          .string()
          .describe("Subito listing URL used as the reference listing."),
        limit: z
          .number()
          .min(1)
          .max(20)
          .optional()
          .describe("Maximum number of comparable listings to return."),
        maxPages: z
          .number()
          .min(1)
          .max(50)
          .optional()
          .describe(
            "Maximum number of search result pages to scan for comparables. Additional pages are scanned only when the server runs with --ignore-robots-txt."
          ),
      },
      outputSchema: {
        reference: listingDetailsSchema,
        derivedQuery: z.string(),
        candidates: z.array(comparableSchema),
        scan: z.object({
          endPage: z.number(),
          pagesScanned: z.number(),
          truncated: z.boolean(),
        }),
      },
    },
    async ({ listingUrl, limit, maxPages }) => {
      try {
        const reference = await getListingDetails(listingUrl);
        if (!reference) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Could not retrieve the reference listing from: ${listingUrl}`,
              },
            ],
            isError: true,
          };
        }

        const derivedQuery = deriveComparableQuery(reference);
        const candidatesResult = await searchListingsAcrossPages({
          query: derivedQuery,
          region: undefined,
          province: undefined,
        }, {
          maxPages,
        });

        const candidates = rankComparableListings(
          reference,
          candidatesResult.listings,
          limit ?? 10
        );

        return {
          content: [
            {
              type: "text" as const,
              text:
                `Reference: ${reference.title}\n` +
                `Derived query: ${derivedQuery}\n` +
                `Found ${candidates.length} comparable listings after scanning ${candidatesResult.pagesScanned} page(s)` +
                (candidatesResult.truncated ? " (truncated)." : "."),
            },
          ],
          structuredContent: {
            reference,
            derivedQuery,
            candidates,
            scan: {
              endPage:
                candidatesResult.startPage + candidatesResult.pagesScanned - 1,
              pagesScanned: candidatesResult.pagesScanned,
              truncated: candidatesResult.truncated,
            },
          },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return {
          content: [
            {
              type: "text" as const,
              text: `Error finding comparable listings: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
