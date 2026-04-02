import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getListingDetails } from "../scraper.js";
import { listingDetailsSchema } from "./shared.js";

const detailsOutputSchema = {
  listing: listingDetailsSchema,
};

export function registerDetailsTools(server: McpServer): void {
  server.registerTool("get_listing_details", {
    description:
      "Get full details of a specific listing on subito.it. Provide the listing URL to retrieve title, description, price, images, advertiser info, and features.",
    inputSchema: {
      url: z
        .string()
        .describe(
          "Full URL of the subito.it listing (e.g. 'https://www.subito.it/telefonia/iphone-15-roma-12345.htm')"
        ),
    },
    outputSchema: detailsOutputSchema,
  },
    async ({ url }) => {
      try {
        const details = await getListingDetails(url);

        if (!details) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Could not retrieve listing details from: ${url}. The listing may have been removed or the URL may be incorrect.`,
              },
            ],
            isError: true,
          };
        }

        const parts = [`# ${details.title}`];

        if (details.price) parts.push(`**Price:** ${details.price}`);
        if (details.location) parts.push(`**Location:** ${details.location}`);
        if (details.date) parts.push(`**Date:** ${details.date}`);
        if (details.category) parts.push(`**Category:** ${details.category}`);

        if (details.advertiser) {
          const advParts = [details.advertiser.name];
          if (details.advertiser.type)
            advParts.push(`(${details.advertiser.type})`);
          parts.push(`**Advertiser:** ${advParts.join(" ")}`);
        }

        if (details.description) {
          parts.push(`\n**Description:**\n${details.description}`);
        }

        const featureEntries = Object.entries(details.features);
        if (featureEntries.length > 0) {
          parts.push("\n**Features:**");
          for (const [label, value] of featureEntries) {
            parts.push(`- ${label}: ${value}`);
          }
        }

        if (details.images.length > 0) {
          parts.push(`\n**Images:** ${details.images.length} photo(s)`);
          for (const img of details.images) {
            parts.push(`- ${img}`);
          }
        }

        parts.push(`\n**URL:** ${details.url}`);

        return {
          content: [
            {
              type: "text" as const,
              text: parts.join("\n"),
            },
          ],
          structuredContent: {
            listing: details,
          },
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        return {
          content: [
            {
              type: "text" as const,
              text: `Error retrieving listing details: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
