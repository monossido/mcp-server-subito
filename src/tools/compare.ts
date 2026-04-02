import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { buildComparisonRows } from "../analysis.js";
import { getListingDetails } from "../scraper.js";
import { listingDetailsSchema } from "./shared.js";

const comparisonRowSchema = z.object({
  field: z.string(),
  values: z.array(z.string().nullable()),
});

export function registerCompareTools(server: McpServer): void {
  server.registerTool(
    "compare_listings",
    {
      description:
        "Fetch multiple listings and return a normalized comparison table across price, location, seller type, brand, model, year, mileage, condition, and image count.",
      inputSchema: {
        urls: z
          .array(z.string())
          .min(2)
          .max(10)
          .describe("Two or more subito.it listing URLs to compare."),
      },
      outputSchema: {
        listings: z.array(listingDetailsSchema),
        comparison: z.array(comparisonRowSchema),
      },
    },
    async ({ urls }) => {
      try {
        const listings = (
          await Promise.all(urls.map((url) => getListingDetails(url)))
        ).filter((listing): listing is NonNullable<typeof listing> => listing !== null);

        if (listings.length < 2) {
          return {
            content: [
              {
                type: "text" as const,
                text: "Could not load at least two listings to compare.",
              },
            ],
            isError: true,
          };
        }

        const comparison = buildComparisonRows(listings);
        const lines = comparison.map(
          (row) => `${row.field}: ${row.values.map((value) => value ?? "-").join(" | ")}`
        );

        return {
          content: [
            {
              type: "text" as const,
              text: `Compared ${listings.length} listings.\n\n${lines.join("\n")}`,
            },
          ],
          structuredContent: {
            listings,
            comparison,
          },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return {
          content: [
            {
              type: "text" as const,
              text: `Error comparing listings: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
